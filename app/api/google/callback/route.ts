import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUserOrg } from '@/lib/auth/current-org'
import { encryptSecret } from '@/lib/crypto'
import {
  buildOAuthMetadata,
  exchangeCodeForTokens,
  expiresInToTimestamp,
  fetchGoogleProfile,
  getGoogleOAuthConfig,
  GOOGLE_PROVIDER,
  hasRequiredScopes,
} from '@/lib/google/oauth'
import { OAUTH_STATE_COOKIE, verifyOAuthState } from '@/lib/google/state'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type EmailAccountInsert = Database['public']['Tables']['email_accounts']['Insert']

const SETTINGS_PATH = '/settings/email-accounts'

function redirectWith(
  origin: string,
  path: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL(path, origin)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = NextResponse.redirect(url)
  // The state is single-use either way.
  response.cookies.delete(OAUTH_STATE_COOKIE)

  return response
}

/**
 * Step 2 of the Gmail connect flow: verify the callback, trade the code for
 * tokens, and store the mailbox with both tokens encrypted at rest.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const params = request.nextUrl.searchParams
  let returnTo = SETTINGS_PATH

  try {
    const oauthError = params.get('error')

    if (oauthError) {
      throw new Error(
        oauthError === 'access_denied'
          ? 'Gmail access was declined.'
          : `Google returned an error: ${oauthError}`,
      )
    }

    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) {
      throw new Error('The Google callback was missing its authorization code.')
    }

    const verified = verifyOAuthState(state, request.cookies.get(OAUTH_STATE_COOKIE)?.value)
    returnTo = verified.returnTo

    const supabase = await createClient()
    const current = await getCurrentUserOrg(supabase)

    if (!current) {
      return redirectWith(origin, '/auth/login', {})
    }

    // The session that finishes the flow must be the one that started it.
    if (current.userId !== verified.userId || current.orgId !== verified.orgId) {
      throw new Error('This Gmail connection was started by a different session.')
    }

    const config = getGoogleOAuthConfig(origin)
    const tokens = await exchangeCodeForTokens(config, code)

    const granted = tokens.scope.split(' ').filter(Boolean)

    if (!hasRequiredScopes(granted)) {
      throw new Error(
        'Some Gmail permissions were not granted. Please reconnect and accept all requested access.',
      )
    }

    const profile = await fetchGoogleProfile(tokens.access_token)

    if (!profile.emailVerified) {
      throw new Error('That Google account does not have a verified email address.')
    }

    const account: EmailAccountInsert = {
      org_id: current.orgId,
      user_id: current.userId,
      provider: GOOGLE_PROVIDER,
      // Lowercased so the (org, user, provider, email) uniqueness key holds.
      email: profile.email.toLowerCase(),
      access_token: encryptSecret(tokens.access_token),
      token_expires_at: expiresInToTimestamp(tokens.expires_in),
      status: 'connected',
      oauth_metadata: buildOAuthMetadata({
        scope: tokens.scope,
        tokenType: tokens.token_type,
        sub: profile.sub,
      }),
    }

    // Google only returns a refresh token when it issues a new one. Leaving the
    // key out of the payload keeps the stored token on a reconnect.
    if (tokens.refresh_token) {
      account.refresh_token = encryptSecret(tokens.refresh_token)
    }

    const { error: upsertError } = await supabase
      .from('email_accounts')
      .upsert(account, { onConflict: 'org_id,user_id,provider,email' })

    if (upsertError) {
      throw new Error(upsertError.message)
    }

    return redirectWith(origin, returnTo, { connected: account.email })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to connect the Gmail account.'

    return redirectWith(origin, returnTo, { error: message })
  }
}
