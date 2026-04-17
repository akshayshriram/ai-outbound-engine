import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type GenerateTemplateRequest = {
    context?: string
    selectedLeadIds?: string[]
}

function parseTemplate(text: string) {
    const normalized = text.trim().replace(/^```json\s*|\s*```$/g, '')
    const parsed = JSON.parse(normalized) as { subject?: unknown; body?: unknown }

    if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') {
        throw new Error('The AI response did not match the expected format.')
    }

    return {
        subject: parsed.subject.trim(),
        body: parsed.body.trim(),
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params
        const payload = (await request.json()) as GenerateTemplateRequest
        const userContext = payload.context?.trim()
        const selectedLeadIds = Array.from(new Set(payload.selectedLeadIds ?? []))

        if (!userContext) {
            return NextResponse.json({ error: 'Context is required.' }, { status: 400 })
        }

        if (selectedLeadIds.length === 0) {
            return NextResponse.json(
                { error: 'Select at least one campaign lead.' },
                { status: 400 },
            )
        }

        const supabase = await createClient()
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError) {
            throw new Error(authError.message)
        }

        const userId = authData.user?.id
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const { data: membership, error: membershipError } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        if (membershipError) {
            throw new Error(membershipError.message)
        }

        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('id, name, org_id')
            .eq('id', id)
            .eq('org_id', membership.org_id)
            .single()

        if (campaignError) {
            throw new Error(campaignError.message)
        }

        const { data: campaignLeads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select('id, leads(first_name, email, company)')
            .eq('campaign_id', campaign.id)
            .in('id', selectedLeadIds)

        if (leadsError) {
            throw new Error(leadsError.message)
        }

        if ((campaignLeads ?? []).length === 0) {
            return NextResponse.json(
                { error: 'No selected leads were found in this campaign.' },
                { status: 404 },
            )
        }

        const leadSummary = (campaignLeads ?? [])
            .map((row, index) => {
                const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads
                return `${index + 1}. Name: ${lead?.first_name ?? 'Unknown'} | Email: ${lead?.email ?? 'Unknown'} | Company: ${lead?.company ?? 'Unknown'}`
            })
            .join('\n')

        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            system: `You are an expert outbound sales representative specializing in writing highly personalized cold emails.

Your goal is to write concise, human-like, and non-spammy outreach emails that feel like they were written manually.

STRICT RULES:
1. Keep the email under 200 words.
2. Use a friendly, conversational tone (not corporate or robotic).
3. Avoid buzzwords, jargon, and generic phrases like:
- "Hope you're doing well"
- "I came across your profile"
- "We are a leading company"
4. The email MUST feel personalized using the provided lead data.
5. Focus on relevance — connect the product/service to the lead's role, company, or context.
6. Do NOT sound like marketing. Sound like a real person reaching out.
7. Include a soft call-to-action (e.g., quick chat, thoughts, open to connect).
8. Avoid aggressive selling or long explanations.
9. Do NOT use emojis.

STRUCTURE GUIDELINES:
- Line 1: Personalized opener (based on lead info)
- Line 2-3: Value proposition (short and relevant)
- Line 4: Light CTA

TEMPLATE REQUIREMENTS:
- You are generating one reusable template for the entire campaign.
- Keep placeholder tokens exactly as written when appropriate: {{first_name}}, {{company}}, {{email}}.
- The final subject and body must be reusable later with real lead data injection.
- Use the selected leads only to understand the audience and improve relevance. Do not hardcode any specific person's real details into the final output unless they appear as placeholders.

OUTPUT FORMAT:
Return valid JSON only with this exact shape:
{"subject":"string","body":"string"}

Return no explanation and no markdown fences.`,
            prompt: `Campaign name: ${campaign.name}

Lead placeholder values:
- Name: {{first_name}}
- Company: {{company}}
- Email: {{email}}

User context:
${userContext}

Selected leads for audience grounding:
${leadSummary}`,
        })

        const template = parseTemplate(text)

        return NextResponse.json(template)
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Unable to generate email template.'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}