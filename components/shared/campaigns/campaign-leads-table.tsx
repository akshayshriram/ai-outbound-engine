'use client'

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import type { Database } from '@/types/database'

type CampaignLeadRow = Database['public']['Tables']['campaign_leads']['Row']
type CampaignLeadStatus =
  Database['public']['Enums']['campaign_lead_status']

export type CampaignLeadRowWithLeadEmail = CampaignLeadRow & {
  leads: Pick<
    Database['public']['Tables']['leads']['Row'],
    'email' | 'first_name' | 'last_name' | 'company'
  >
}

function campaignLeadStatusBadge(status: CampaignLeadStatus) {
  switch (status) {
    case 'pending':
      return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    case 'sent':
      return 'bg-primary/20 text-primary border-primary/20'
    case 'replied':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'failed':
      return 'bg-destructive/20 text-destructive-foreground border-destructive/20'
    default:
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
  }
}

export function CampaignLeadsTable({
  rows,
  selectedRowIds,
  onSelectedRowIdsChange,
}: {
  rows: CampaignLeadRowWithLeadEmail[]
  selectedRowIds?: string[]
  onSelectedRowIdsChange?: (ids: string[]) => void
}) {
  const columns = React.useMemo<DataTableColumn<CampaignLeadRowWithLeadEmail>[]>(
    () => [
      {
        id: 'select',
        header: (
          <input
            type="checkbox"
            aria-label="Select all leads"
            className="size-4 rounded border-border align-middle"
            checked={rows.length > 0 && rows.every((row) => selectedRowIds?.includes(row.id))}
            onChange={(event) => {
              if (!onSelectedRowIdsChange) return
              onSelectedRowIdsChange(event.target.checked ? rows.map((row) => row.id) : [])
            }}
          />
        ),
        cell: (row) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.leads.email ?? 'lead'}`}
            className="size-4 rounded border-border align-middle"
            checked={selectedRowIds?.includes(row.id) ?? false}
            onChange={(event) => {
              if (!onSelectedRowIdsChange) return
              onSelectedRowIdsChange(
                event.target.checked
                  ? [...(selectedRowIds ?? []), row.id]
                  : (selectedRowIds ?? []).filter((id) => id !== row.id),
              )
            }}
          />
        ),
        className: 'w-12',
      },
      {
        id: 'email',
        header: 'Lead email',
        cell: (row) => (
          <div className="min-w-[220px]">
            <div className="font-medium text-foreground">{row.leads.email ?? '-'}</div>
            <div className="text-xs text-muted-foreground">
              {[row.leads.first_name, row.leads.last_name].filter(Boolean).join(' ') ||
                row.leads.company ||
                'No lead details'}
            </div>
          </div>
        ),
      },
      {
        id: 'company',
        header: 'Company',
        cell: (row) => <div>{row.leads.company ?? '-'}</div>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge
            variant="outline"
            className={campaignLeadStatusBadge(row.status)}
          >
            {row.status}
          </Badge>
        ),
      },
      {
        id: 'last_contacted_at',
        header: 'Last contacted',
        cell: (row) => (
          <div className="whitespace-nowrap">
            {row.last_contacted_at
              ? new Date(row.last_contacted_at).toLocaleString()
              : '-'}
          </div>
        ),
      },
    ],
    [onSelectedRowIdsChange, rows, selectedRowIds],
  )

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      emptyState={
        <div className="py-10">
          <div className="text-sm text-muted-foreground">
            No leads in this campaign yet.
          </div>
        </div>
      }
    />
  )
}

