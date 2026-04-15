'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampaignLeadsTable } from '@/components/shared/campaigns/campaign-leads-table'
import { type CampaignLeadRowWithLeadEmail } from '@/components/shared/campaigns/campaign-leads-table'
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
        <Button asChild variant="outline" size="sm">
          <Link href="/campaigns">Back</Link>
        </Button>
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
          <CardTitle>Campaign Leads</CardTitle>
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
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

