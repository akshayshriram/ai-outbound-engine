'use client'

import Link from 'next/link'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import type { Database } from '@/types/database'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']
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

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  const columns = React.useMemo<DataTableColumn<CampaignRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Campaign',
        cell: (campaign) => (
          <div className="min-w-[220px]">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="font-medium hover:underline"
            >
              {campaign.name}
            </Link>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (campaign) => (
          <Badge
            variant="outline"
            className={campaignStatusBadge(campaign.status)}
          >
            {campaign.status}
          </Badge>
        ),
      },
      {
        id: 'created_at',
        header: 'Created',
        cell: (campaign) => (
          <div className="whitespace-nowrap">
            {new Date(campaign.created_at).toLocaleDateString()}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <DataTable
      rows={campaigns}
      columns={columns}
      rowKey={(campaign) => campaign.id}
      emptyState={
        <div className="py-10">
          <div className="text-sm text-muted-foreground">
            No campaigns yet.
          </div>
        </div>
      }
    />
  )
}

