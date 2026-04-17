'use client'

import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampaignLeadsTable } from '@/components/shared/campaigns/campaign-leads-table'
import { type CampaignLeadRowWithLeadEmail } from '@/components/shared/campaigns/campaign-leads-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCampaignById, listCampaignLeadsWithLeadEmail } from '@/lib/services/campaigns.service'
import {
  useAddLeadToCampaign,
  useAvailableLeadsForCampaign,
} from '@/lib/hooks/useCampaigns'
import type { Database } from '@/types/database'
import Link from 'next/link'
import { use } from 'react'

type CampaignStatus = Database['public']['Enums']['campaign_status']

function campaignStatusBadge(status: CampaignStatus) {
  switch (status) {
    case 'draft':
      return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    case 'active':
      return 'bg-primary/20 text-primary border-primary/20'
    case 'paused':
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
    case 'completed':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'archived':
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
    default:
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
  }
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const campaignId = id

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    error: campaignError,
  } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaignById(campaignId),
    enabled: !!campaignId,
  })

  const {
    data: campaignLeads,
    isLoading: isLeadsLoading,
    isError: isLeadsError,
    error: leadsError,
  } = useQuery({
    queryKey: ['campaign-leads', campaignId],
    queryFn: async () =>
      (await listCampaignLeadsWithLeadEmail(campaignId)) as CampaignLeadRowWithLeadEmail[],
    enabled: !!campaignId,
  })

  const {
    data: availableLeads,
    isLoading: isAvailableLeadsLoading,
    isError: isAvailableLeadsError,
    error: availableLeadsError,
  } = useAvailableLeadsForCampaign(campaignId)
  const addLeadMutation = useAddLeadToCampaign(campaignId)
  const [selectedLeadId, setSelectedLeadId] = React.useState('')
  const [selectedCampaignLeadIds, setSelectedCampaignLeadIds] = React.useState<string[]>([])
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = React.useState(false)
  const [generationContext, setGenerationContext] = React.useState('')
  const [generatedTemplate, setGeneratedTemplate] = React.useState<{
    subject: string
    body: string
  } | null>(null)

  const generateTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/campaign/${campaignId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: generationContext,
          selectedLeadIds: selectedCampaignLeadIds,
        }),
      })

      const data = (await response.json()) as
        | { subject?: string; body?: string; error?: string }
        | undefined

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate email template.')
      }

      if (!data?.subject || !data.body) {
        throw new Error('The AI response did not return a valid template.')
      }

      return { subject: data.subject, body: data.body }
    },
    onSuccess: (template) => {
      setGeneratedTemplate(template)
      toast.success('Email template generated.')
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to generate email template.',
      )
    },
  })

  React.useEffect(() => {
    if ((availableLeads ?? []).length === 0) {
      setSelectedLeadId('')
      return
    }

    setSelectedLeadId((prev) => {
      if (prev && (availableLeads ?? []).some((lead) => lead.id === prev)) {
        return prev
      }
      return availableLeads?.[0]?.id ?? ''
    })
  }, [availableLeads])

  React.useEffect(() => {
    setSelectedCampaignLeadIds((prev) => {
      const validIds = new Set((campaignLeads ?? []).map((lead) => lead.id))
      return prev.filter((id) => validIds.has(id))
    })
  }, [campaignLeads])

  const onAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return

    try {
      await addLeadMutation.mutateAsync({ leadId: selectedLeadId })
      toast.success('Lead added to campaign.')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to add lead to campaign.'
      toast.error(message)
    }
  }

  const selectedLeads = React.useMemo(
    () => (campaignLeads ?? []).filter((lead) => selectedCampaignLeadIds.includes(lead.id)),
    [campaignLeads, selectedCampaignLeadIds],
  )

  const onOpenGenerateDialog = () => {
    if (selectedCampaignLeadIds.length === 0) {
      toast.error('Select at least one campaign lead to generate a template.')
      return
    }

    setIsGenerateDialogOpen(true)
  }

  const onGenerateTemplate = async () => {
    if (!generationContext.trim()) {
      toast.error('Add a little context so the email feels relevant.')
      return
    }

    if (selectedCampaignLeadIds.length === 0) {
      toast.error('Select at least one campaign lead to continue.')
      return
    }

    await generateTemplateMutation.mutateAsync()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Campaign
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View campaign details and contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onOpenGenerateDialog}
            disabled={(campaignLeads?.length ?? 0) === 0}
            className="border border-primary/30 bg-linear-to-r from-primary to-primary/70 text-primary-foreground shadow-[0_0_24px_rgba(59,130,246,0.18)]"
          >
            <Sparkles className="mr-2 size-4" />
            Generate Emails
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/campaigns">Back</Link>
          </Button>
        </div>
      </div>

      {isCampaignLoading ? (
        <Card>
          <CardContent className="py-10 text-muted-foreground">
            Loading campaign...
          </CardContent>
        </Card>
      ) : null}

      {isCampaignError ? (
        <Card>
          <CardContent className="py-10">
            <div className="space-y-3">
              <div className="text-sm font-medium">Failed to load campaign</div>
              <div className="text-sm text-muted-foreground">
                {campaignError instanceof Error
                  ? campaignError.message
                  : 'Unknown error'}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {campaign ? (
        <Card className="mb-6">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{campaign.name}</span>
              <Badge
                variant="outline"
                className={campaignStatusBadge(campaign.status)}
              >
                {campaign.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">
              Created:{' '}
              <span className="text-foreground">
                {new Date(campaign.created_at).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Campaign Leads</CardTitle>
              <p className="pt-1 text-sm text-muted-foreground">
                Select leads to shape the AI template, then personalize later with placeholders.
              </p>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
              {selectedCampaignLeadIds.length} selected
            </div>
          </div>
          <div className="pt-3">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onAddLead}>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                disabled={
                  isAvailableLeadsLoading ||
                  addLeadMutation.isPending ||
                  (availableLeads?.length ?? 0) === 0
                }
              >
                {(availableLeads ?? []).map((lead) => {
                  const fullName = [lead.first_name, lead.last_name]
                    .filter(Boolean)
                    .join(' ')
                    .trim()
                  const label = fullName ? `${fullName} (${lead.email})` : lead.email
                  return (
                    <option key={lead.id} value={lead.id}>
                      {label}
                    </option>
                  )
                })}
              </select>
              <Button
                type="submit"
                disabled={
                  !selectedLeadId ||
                  isAvailableLeadsLoading ||
                  addLeadMutation.isPending
                }
              >
                {addLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
              </Button>
            </form>
            {isAvailableLeadsError ? (
              <div className="pt-2 text-sm text-muted-foreground">
                {availableLeadsError instanceof Error
                  ? availableLeadsError.message
                  : 'Unable to load available leads.'}
              </div>
            ) : null}
            {!isAvailableLeadsLoading && (availableLeads?.length ?? 0) === 0 ? (
              <div className="pt-2 text-sm text-muted-foreground">
                All leads in this workspace are already in this campaign.
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLeadsLoading ? (
            <div className="py-10 text-muted-foreground">Loading leads...</div>
          ) : null}

          {isLeadsError ? (
            <div className="py-10">
              <div className="text-sm font-medium">Failed to load campaign leads</div>
              <div className="text-sm text-muted-foreground">
                {leadsError instanceof Error ? leadsError.message : 'Unknown error'}
              </div>
            </div>
          ) : null}

          {!isLeadsLoading && !isLeadsError ? (
            <CampaignLeadsTable
              rows={(campaignLeads ?? []) as CampaignLeadRowWithLeadEmail[]}
              selectedRowIds={selectedCampaignLeadIds}
              onSelectedRowIdsChange={setSelectedCampaignLeadIds}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Generate Email Template
            </DialogTitle>
            <DialogDescription>
              Create one campaign-level cold email template with placeholder variables like
              {' '}
              <code>{'{{first_name}}'}</code>
              {' '}
              and
              {' '}
              <code>{'{{company}}'}</code>
              . Lead data will be injected later during Gmail sending.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] max-h-[500px] overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  AI guidance
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe your offer, who this campaign targets, and why the message should feel relevant.
                  The generator will keep the email short, human, and non-spammy.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="email-generation-context" className="text-sm font-medium">
                  Campaign context
                </label>
                <textarea
                  id="email-generation-context"
                  className="min-h-40 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Example: We help B2B SaaS teams book more qualified demos by automating research-heavy outbound without sounding templated."
                  value={generationContext}
                  onChange={(event) => setGenerationContext(event.target.value)}
                />
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-sm font-medium">Selected leads</div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {selectedLeads.map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-border/60 px-3 py-2">
                      <div className="font-medium text-foreground">
                        {lead.leads.first_name || 'Unknown'} · {lead.leads.email}
                      </div>
                      <div>{lead.leads.company || 'No company added'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              <div>
                <div className="text-sm font-medium">Generated preview</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is the reusable template for the campaign. Lead placeholders stay intact for later sending.
                </p>
              </div>

              {generatedTemplate ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Subject
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {generatedTemplate.subject}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Body
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap wrap-break-word font-sans text-sm text-foreground">
                      {generatedTemplate.body}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                  Generate a template to preview the subject and email body here.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={onGenerateTemplate}
              disabled={generateTemplateMutation.isPending || selectedCampaignLeadIds.length === 0}
              className="bg-primary text-primary-foreground"
            >
              {generateTemplateMutation.isPending
                ? 'Generating...'
                : 'Generate Email Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

