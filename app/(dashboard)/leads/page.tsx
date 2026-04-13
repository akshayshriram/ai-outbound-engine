'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { LeadTable } from '@/components/shared/leads/lead-table'
import { CreateLeadModal } from '@/components/shared/leads/create-lead-modal'
import { useLeads } from '@/lib/hooks/useLeads'
import { useAppStore } from '@/store/useAppStore'

export default function LeadsPage() {
  const pageSize = 10
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const { setIsCreateLeadOpen } = useAppStore()

  const { leads, totalCount, isLoading, isError, error, refetch } = useLeads({
    search,
    page,
    pageSize,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  React.useEffect(() => {
    // Keep pagination sane when the search term changes.
    setPage(1)
  }, [search])

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage your contacts and outbound pipeline."
      />

      {/* Top controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Input
            placeholder="Search name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          onClick={() => {
            setIsCreateLeadOpen(true)
          }}
        >
          Add Lead
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-muted-foreground">
            Loading leads...
          </CardContent>
        </Card>
      ) : null}

      {isError ? (
        <Card>
          <CardContent className="py-10">
            <div className="space-y-3">
              <div className="text-sm font-medium">Failed to load leads</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError ? <LeadTable leads={leads} /> : null}

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modal */}
      <CreateLeadModal />
    </div>
  )
}

