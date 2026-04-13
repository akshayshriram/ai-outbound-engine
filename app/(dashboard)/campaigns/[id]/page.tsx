'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampaignLeadsTable } from '@/components/shared/campaigns/campaign-leads-table'
import { type CampaignLeadRowWithLeadEmail } from '@/components/shared/campaigns/campaign-leads-table'
import { getCampaignById, listCampaignLeadsWithLeadEmail } from '@/lib/services/campaigns.service'
import type { Database } from '@/types/database'
import Link from 'next/link'

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
  params: { id: string }
}) {
  const campaignId = params.id

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

