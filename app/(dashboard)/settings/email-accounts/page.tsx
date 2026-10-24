'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { useDisconnectEmailAccount, useEmailAccounts } from '@/lib/hooks/useEmailAccounts'
import { startGmailConnect } from '@/lib/services/email-accounts.service'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'outline' | 'destructive' }> = {
  connected: { label: 'Connected', variant: 'default' },
  reauth_required: { label: 'Reconnect needed', variant: 'destructive' },
  revoked: { label: 'Revoked', variant: 'destructive' },
}

export default function EmailAccountsPage() {
  const { accounts, isLoading, isError, error, refetch } = useEmailAccounts()
  const disconnect = useDisconnectEmailAccount()

  // The OAuth callback redirects back here with ?connected= or ?error=. Read it
  // from the URL directly so the page needs no Suspense boundary, then strip it
  // so a refresh does not replay the toast.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const oauthError = params.get('error')

    if (!connected && !oauthError) return

    if (connected) {
      toast.success(`Connected ${connected}`)
      void refetch()
    } else if (oauthError) {
      toast.error(oauthError)
    }

    window.history.replaceState({}, '', window.location.pathname)
  }, [refetch])

  const handleDisconnect = (id: string, email: string) => {
    disconnect.mutate(id, {
      onSuccess: () => toast.success(`Disconnected ${email}`),
      onError: (mutationError) =>
        toast.error(
          mutationError instanceof Error
            ? mutationError.message
            : 'Unable to disconnect the account.',
        ),
    })
  }

  return (
    <div>
      <PageHeader
        title="Email Accounts"
        description="Connect your email provider for outbound and reply tracking."
        actions={
          <Button onClick={() => startGmailConnect()}>Connect Gmail</Button>
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

      {!isLoading && !isError && accounts.length === 0 ? (
        <EmptyState
          title="No connected accounts"
          description="Connect Gmail to start sending emails and tracking replies."
          action={{
            label: 'Connect Gmail',
            onClick: () => startGmailConnect(),
          }}
        />
      ) : null}

      {!isLoading && !isError && accounts.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => {
                  const status = STATUS_LABELS[acc.status] ?? {
                    label: acc.status,
                    variant: 'outline' as const,
                  }

                  return (
                    <TableRow key={acc.id}>
                      <TableCell>
                        <div className="min-w-[220px] font-medium">{acc.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{acc.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(acc.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={disconnect.isPending}
                          onClick={() => handleDisconnect(acc.id, acc.email)}
                        >
                          Disconnect
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
