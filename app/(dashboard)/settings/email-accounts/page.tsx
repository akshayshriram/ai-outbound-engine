'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/utils/supabase/types/database'

type EmailAccountRow = Database['public']['Tables']['email_accounts']['Row']

export default function EmailAccountsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, email, provider, created_at')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data as EmailAccountRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  return (
    <div>
      <PageHeader
        title="Email Accounts"
        description="Connect your email provider for outbound and reply tracking."
        actions={
          <Button
            onClick={() => {
              // Mock action for now (production: start OAuth flow)
              console.log('Connect Gmail clicked')
            }}
          >
            Connect Gmail
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-muted-foreground">
            Loading connected accounts...
          </CardContent>
        </Card>
      ) : null}

      {isError ? (
        <Card>
          <CardContent className="py-10">
            <div className="space-y-3">
              <div className="text-sm font-medium">Failed to load accounts</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No connected accounts"
          description="Connect Gmail to start sending emails and tracking replies."
          action={{
            label: 'Connect Gmail',
            onClick: () => console.log('Connect Gmail clicked'),
          }}
        />
      ) : null}

      {!isLoading && !isError && (data?.length ?? 0) > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Connected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <div className="min-w-[220px] font-medium">
                        {acc.email ?? '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {acc.provider ?? 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(acc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

