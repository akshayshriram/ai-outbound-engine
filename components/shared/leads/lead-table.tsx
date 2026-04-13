'use client'

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import type { Database } from '@/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']
type LeadStatus = Database['public']['Enums']['lead_status']

function leadStatusBadge(status: LeadStatus) {
  switch (status) {
    case 'new':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'contacted':
      return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    case 'qualified':
      return 'bg-primary/20 text-primary border-primary/20'
    case 'lost':
      return 'bg-destructive/20 text-destructive-foreground border-destructive/20'
    case 'unsubscribed':
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
    default:
      return 'bg-muted/10 text-muted-foreground border-muted-foreground/20'
  }
}

function leadDisplayName(lead: LeadRow) {
  const first = lead.first_name ?? ''
  const last = lead.last_name ?? ''
  const full = `${first} ${last}`.trim()
  return full.length > 0 ? full : lead.email
}

export function LeadTable({ leads }: { leads: LeadRow[] }) {
  const columns = React.useMemo<DataTableColumn<LeadRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (lead) => (
          <div className="min-w-[180px]">
            <div className="font-medium">{leadDisplayName(lead)}</div>
          </div>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        cell: (lead) => <div className="min-w-[220px]">{lead.email}</div>,
      },
      {
        id: 'company',
        header: 'Company',
        cell: (lead) => <div>{lead.company ?? '-'}</div>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (lead) => (
          <Badge variant="outline" className={leadStatusBadge(lead.status)}>
            {lead.status}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <DataTable
      rows={leads}
      columns={columns}
      rowKey={(lead) => lead.id}
      emptyState={
        <div className="py-10">
          <div className="text-sm text-muted-foreground">
            No leads match your filters.
          </div>
        </div>
      }
    />
  )
}

