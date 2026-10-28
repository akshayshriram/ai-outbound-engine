import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUserOrg } from '@/lib/auth/current-org'
import {
  parseCampaignEmailTemplate,
  renderCampaignEmailTemplate,
} from '@/lib/campaign-template'
import { sendGmailMessage } from '@/lib/google/gmail'
import { getValidGmailAccessToken, GmailReconnectRequiredError } from '@/lib/google/tokens'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

type SendRequest = {
  campaignLeadIds?: string[]
  /** Allow contacting a lead that is already marked sent. */
  resend?: boolean
}

export type CampaignSendResult = {
  campaignLeadId: string
  email: string
  status: 'sent' | 'failed' | 'skipped'
  detail?: string
}

/** Supabase types a to-one join as either an object or a single-element array. */
function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function POST(request: NextRequest, ctx: RouteContext<'/api/campaign/[id]/send'>) {
  try {
    const { id } = await ctx.params
    const payload = (await request.json()) as SendRequest
    const campaignLeadIds = Array.from(new Set(payload.campaignLeadIds ?? []))

    if (campaignLeadIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one lead to email.' }, { status: 400 })
    }

    const supabase = await createClient()
    const current = await getCurrentUserOrg(supabase)

    if (!current) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, email_template')
      .eq('id', id)
      .eq('org_id', current.orgId)
      .maybeSingle()

    if (campaignError) throw new Error(campaignError.message)
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
    }

    const template = parseCampaignEmailTemplate(campaign.email_template)

    if (!template) {
      return NextResponse.json(
        { error: 'Generate an email template for this campaign before sending.' },
        { status: 400 },
      )
    }

    const { data: campaignLeads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('id, status, lead_id, leads(first_name, last_name, company, email)')
      .eq('campaign_id', campaign.id)
      .in('id', campaignLeadIds)

    if (leadsError) throw new Error(leadsError.message)
    if ((campaignLeads ?? []).length === 0) {
      return NextResponse.json(
        { error: 'No selected leads were found in this campaign.' },
        { status: 404 },
      )
    }

    // Resolved once for the whole batch; refreshes the token if it has expired.
    const account = await getValidGmailAccessToken(supabase, {
      orgId: current.orgId,
      userId: current.userId,
      origin: request.nextUrl.origin,
    })

    const results: CampaignSendResult[] = []

    // Sequential on purpose: one send at a time keeps us well inside Gmail's
    // per-user rate limits and makes a partial failure easy to reason about.
    for (const campaignLead of campaignLeads ?? []) {
      const lead = firstRelation<Pick<LeadRow, 'first_name' | 'last_name' | 'company' | 'email'>>(
        campaignLead.leads,
      )
      const recipientEmail = lead?.email ?? ''

      if (!recipientEmail) {
        results.push({
          campaignLeadId: campaignLead.id,
          email: '-',
          status: 'failed',
          detail: 'This lead has no email address.',
        })
        continue
      }

      if (campaignLead.status === 'sent' && !payload.resend) {
        results.push({
          campaignLeadId: campaignLead.id,
          email: recipientEmail,
          status: 'skipped',
          detail: 'Already contacted in this campaign.',
        })
        continue
      }

      const rendered = renderCampaignEmailTemplate(template, lead ?? {})

      // Better a refused send than a prospect receiving "Hi {{first_name}}".
      if (rendered.unresolved.length > 0) {
        results.push({
          campaignLeadId: campaignLead.id,
          email: recipientEmail,
          status: 'failed',
          detail: `Unresolved placeholders: ${rendered.unresolved
            .map((key) => `{{${key}}}`)
            .join(', ')}`,
        })
        continue
      }

      try {
        const sent = await sendGmailMessage({
          accessToken: account.accessToken,
          from: account.email,
          to: recipientEmail,
          subject: rendered.subject,
          body: rendered.body,
        })

        const sentAt = new Date().toISOString()

        // The message has already left; a failure to record it must be surfaced
        // rather than thrown, or we would report a send that has no audit trail.
        const recordErrors = [
          (
            await supabase.from('emails').insert({
              campaign_lead_id: campaignLead.id,
              subject: rendered.subject,
              body: rendered.body,
              provider_message_id: sent.messageId,
              status: 'sent',
              sent_at: sentAt,
            })
          ).error,
          (
            await supabase
              .from('campaign_leads')
              .update({ status: 'sent', last_contacted_at: sentAt })
              .eq('id', campaignLead.id)
          ).error,
          (
            await supabase.from('lead_activities').insert({
              lead_id: campaignLead.lead_id,
              org_id: current.orgId,
              type: 'emailed',
              metadata: {
                campaign_id: campaign.id,
                provider_message_id: sent.messageId,
                thread_id: sent.threadId,
                subject: rendered.subject,
                from: account.email,
              },
            })
          ).error,
        ].filter((entry) => entry !== null)

        results.push({
          campaignLeadId: campaignLead.id,
          email: recipientEmail,
          status: 'sent',
          detail: recordErrors.length
            ? `Delivered, but recording it failed: ${recordErrors
                .map((entry) => entry.message)
                .join('; ')}`
            : undefined,
        })
      } catch (sendError) {
        const detail =
          sendError instanceof Error ? sendError.message : 'Gmail rejected the message.'

        // Record the attempt so a failure is visible rather than silent.
        await supabase.from('emails').insert({
          campaign_lead_id: campaignLead.id,
          subject: rendered.subject,
          body: rendered.body,
          status: 'failed',
        })

        await supabase
          .from('campaign_leads')
          .update({ status: 'failed' })
          .eq('id', campaignLead.id)

        results.push({
          campaignLeadId: campaignLead.id,
          email: recipientEmail,
          status: 'failed',
          detail,
        })
      }
    }

    return NextResponse.json({
      from: account.email,
      sent: results.filter((result) => result.status === 'sent').length,
      failed: results.filter((result) => result.status === 'failed').length,
      skipped: results.filter((result) => result.status === 'skipped').length,
      results,
    })
  } catch (error) {
    if (error instanceof GmailReconnectRequiredError) {
      return NextResponse.json(
        { error: error.message, reconnectRequired: true },
        { status: 409 },
      )
    }

    const message = error instanceof Error ? error.message : 'Unable to send the email.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
