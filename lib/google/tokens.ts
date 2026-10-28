import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { encryptSecret, decryptSecret } from '@/lib/crypto'
import {
  expiresInToTimestamp,
  getGoogleOAuthConfig,
  GOOGLE_PROVIDER,
  refreshAccessToken,
} from '@/lib/google/oauth'
import type { Database } from '@/types/database'

type DBClient = SupabaseClient<Database>

/** Refresh this far ahead of expiry so a send never races the clock. */
const EXPIRY_SKEW_MS = 60_000

export type ActiveGmailAccount = {
  id: string
  email: string
  accessToken: string
}

export class GmailReconnectRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GmailReconnectRequiredError'
  }
}

async function markReauthRequired(supabase: DBClient, accountId: string) {
  await supabase
    .from('email_accounts')
    .update({ status: 'reauth_required' })
    .eq('id', accountId)
}

/**
 * Returns a usable Gmail access token for the caller's connected mailbox,
 * refreshing it first when it is expired or about to be.
 *
 * Every Gmail call goes through here: access tokens last an hour, so treating
 * the stored one as usable is only ever correct by luck.
 */
export async function getValidGmailAccessToken(
  supabase: DBClient,
  params: { orgId: string; userId: string; origin: string },
): Promise<ActiveGmailAccount> {
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('id, email, status, access_token, refresh_token, token_expires_at')
    .eq('org_id', params.orgId)
    .eq('user_id', params.userId)
    .eq('provider', GOOGLE_PROVIDER)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!account) {
    throw new GmailReconnectRequiredError(
      'No Gmail account is connected. Connect one in Settings to send email.',
    )
  }

  if (account.status !== 'connected') {
    throw new GmailReconnectRequiredError(
      'This Gmail account needs to be reconnected before it can send email.',
    )
  }

  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0
  const isUsable = account.access_token && expiresAt - EXPIRY_SKEW_MS > Date.now()

  if (isUsable) {
    return {
      id: account.id,
      email: account.email,
      accessToken: decryptSecret(account.access_token!),
    }
  }

  if (!account.refresh_token) {
    await markReauthRequired(supabase, account.id)
    throw new GmailReconnectRequiredError(
      'This Gmail account has no refresh token. Please reconnect it in Settings.',
    )
  }

  const config = getGoogleOAuthConfig(params.origin)

  let refreshed
  try {
    refreshed = await refreshAccessToken(config, decryptSecret(account.refresh_token))
  } catch (refreshError) {
    // Google rejects a revoked or expired grant here; only a new consent fixes it.
    await markReauthRequired(supabase, account.id)
    throw new GmailReconnectRequiredError(
      refreshError instanceof Error
        ? `Gmail access could not be renewed (${refreshError.message}). Please reconnect the account.`
        : 'Gmail access could not be renewed. Please reconnect the account.',
    )
  }

  const { error: updateError } = await supabase
    .from('email_accounts')
    .update({
      access_token: encryptSecret(refreshed.access_token),
      token_expires_at: expiresInToTimestamp(refreshed.expires_in),
      status: 'connected',
    })
    .eq('id', account.id)

  if (updateError) throw new Error(updateError.message)

  return {
    id: account.id,
    email: account.email,
    accessToken: refreshed.access_token,
  }
}
