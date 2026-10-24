import 'server-only'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

/**
 * `gmail.send` powers outbound; `gmail.readonly` powers reply tracking.
 * `gmail.readonly` is a Google *restricted* scope — it works while the OAuth
 * app is in testing mode, but needs a security assessment before public launch.
 */
export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const

export const GOOGLE_PROVIDER = 'gmail'

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * The redirect URI must byte-match an "Authorised redirect URI" in the Google
 * Cloud console. Set GOOGLE_REDIRECT_URI in deployed environments; locally we
 * derive it from the incoming request origin.
 */
export function getGoogleOAuthConfig(requestOrigin: string): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_SECRET_KEY?.trim()

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_SECRET_KEY must be set.')
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${requestOrigin}/api/google/callback`

  return { clientId, clientSecret, redirectUri }
}

export function buildGoogleAuthUrl(
  config: GoogleOAuthConfig,
  options: { state: string; loginHint?: string },
): string {
  const url = new URL(AUTH_ENDPOINT)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '))
  // offline + consent guarantees a refresh_token even on a repeat connect.
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', options.state)

  if (options.loginHint) {
    url.searchParams.set('login_hint', options.loginHint)
  }

  return url.toString()
}

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

async function postToken(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | (Partial<GoogleTokenResponse> & { error?: string; error_description?: string })
    | null

  if (!response.ok || !payload?.access_token) {
    const reason = payload?.error_description ?? payload?.error ?? `HTTP ${response.status}`
    throw new Error(`Google rejected the token request: ${reason}`)
  }

  return payload as GoogleTokenResponse
}

export function exchangeCodeForTokens(config: GoogleOAuthConfig, code: string) {
  return postToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  )
}

/** Google omits `refresh_token` on refresh responses; keep the stored one. */
export function refreshAccessToken(config: GoogleOAuthConfig, refreshToken: string) {
  return postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  )
}

export type GoogleProfile = {
  sub: string
  email: string
  emailVerified: boolean
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Could not read the Google profile: HTTP ${response.status}`)
  }

  const payload = (await response.json()) as {
    sub?: unknown
    email?: unknown
    email_verified?: unknown
  }

  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new Error('The Google profile response did not include an account email.')
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
  }
}

/** Best-effort: tell Google to drop the grant when a user disconnects. */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      cache: 'no-store',
    })

    return response.ok
  } catch {
    return false
  }
}

export function expiresInToTimestamp(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString()
}

/**
 * Non-secret OAuth details stored in `email_accounts.oauth_metadata`. Kept as
 * jsonb because this set grows (history ids, watch expiry, send-as aliases);
 * this function is the single parse boundary for reads.
 */
export type OAuthMetadata = {
  scope: string[]
  tokenType: string | null
  sub: string | null
  connectedAt: string | null
}

export function buildOAuthMetadata(input: {
  scope: string
  tokenType: string
  sub: string
}): { scope: string[]; token_type: string; sub: string; connected_at: string } {
  return {
    scope: input.scope.split(' ').filter(Boolean),
    token_type: input.tokenType,
    sub: input.sub,
    connected_at: new Date().toISOString(),
  }
}

export function parseOAuthMetadata(value: unknown): OAuthMetadata {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return {
    scope: Array.isArray(record.scope)
      ? record.scope.filter((entry): entry is string => typeof entry === 'string')
      : [],
    tokenType: typeof record.token_type === 'string' ? record.token_type : null,
    sub: typeof record.sub === 'string' ? record.sub : null,
    connectedAt: typeof record.connected_at === 'string' ? record.connected_at : null,
  }
}

export function hasRequiredScopes(granted: string[]): boolean {
  return GOOGLE_SCOPES.filter((scope) => scope.startsWith('https://')).every((scope) =>
    granted.includes(scope),
  )
}
