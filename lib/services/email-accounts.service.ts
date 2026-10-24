import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type EmailAccountRow = Database['public']['Tables']['email_accounts']['Row']
type DBClient = SupabaseClient<Database>

/**
 * Non-secret projection of `email_accounts`. The token columns are deliberately
 * absent — ciphertext has no business reaching the browser.
 */
export type ConnectedEmailAccount = Pick<
  EmailAccountRow,
  'id' | 'email' | 'provider' | 'status' | 'token_expires_at' | 'created_at'
> & {
  scope: string[]
}

const ACCOUNT_COLUMNS = 'id, email, provider, status, token_expires_at, created_at, oauth_metadata'

export async function listEmailAccounts(client?: DBClient): Promise<ConnectedEmailAccount[]> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase
    .from('email_accounts')
    .select(ACCOUNT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const metadata = row.oauth_metadata

    const scope =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? ((metadata as Record<string, unknown>).scope ?? [])
        : []

    return {
      id: row.id,
      email: row.email,
      provider: row.provider,
      status: row.status,
      token_expires_at: row.token_expires_at,
      created_at: row.created_at,
      scope: Array.isArray(scope)
        ? scope.filter((entry): entry is string => typeof entry === 'string')
        : [],
    }
  })
}

export async function disconnectEmailAccount(id: string): Promise<void> {
  const response = await fetch('/api/google/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  const payload = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to disconnect the account.')
  }
}

/** Entry point for the connect flow; the route handles auth and state. */
export function startGmailConnect(returnTo = '/settings/email-accounts'): void {
  window.location.href = `/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`
}
