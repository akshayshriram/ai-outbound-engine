import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'

import { safeEquals } from '@/lib/crypto'

export const OAUTH_STATE_COOKIE = 'google_oauth_state'
const STATE_TTL_MS = 10 * 60 * 1000

type StatePayload = {
  /** Nonce — makes every state value unique even for identical sessions. */
  n: string
  /** User the flow was started by; the callback refuses a different session. */
  u: string
  /** Org the mailbox will be filed under. */
  o: string
  /** Relative path to return the browser to. */
  r: string
  /** Expiry, epoch ms. */
  e: number
}

export type OAuthState = {
  userId: string
  orgId: string
  returnTo: string
}

function stateSecret(): string {
  const secret = process.env.AES_KEY?.trim()

  if (!secret) {
    throw new Error('AES_KEY is not set. The OAuth state cannot be signed.')
  }

  return secret
}

function sign(body: string): string {
  return createHmac('sha256', stateSecret()).update(body).digest('base64url')
}

export function createOAuthState(input: OAuthState): string {
  const payload: StatePayload = {
    n: randomBytes(16).toString('base64url'),
    u: input.userId,
    o: input.orgId,
    r: input.returnTo,
    e: Date.now() + STATE_TTL_MS,
  }

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

/**
 * Verifies the state twice over: the HMAC proves we minted it, and the caller
 * separately checks it against the httpOnly cookie so a state lifted from a
 * redirect URL cannot be replayed in another browser.
 */
export function verifyOAuthState(state: string, cookieValue: string | undefined): OAuthState {
  if (!cookieValue || !safeEquals(state, cookieValue)) {
    throw new Error('The sign-in request could not be verified. Please try connecting again.')
  }

  const [body, signature] = state.split('.')

  if (!body || !signature || !safeEquals(signature, sign(body))) {
    throw new Error('The sign-in request could not be verified. Please try connecting again.')
  }

  let payload: StatePayload

  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload
  } catch {
    throw new Error('The sign-in request could not be verified. Please try connecting again.')
  }

  if (typeof payload.e !== 'number' || payload.e < Date.now()) {
    throw new Error('The sign-in request expired. Please try connecting again.')
  }

  if (typeof payload.u !== 'string' || typeof payload.o !== 'string') {
    throw new Error('The sign-in request could not be verified. Please try connecting again.')
  }

  return {
    userId: payload.u,
    orgId: payload.o,
    returnTo: payload.r?.startsWith('/') ? payload.r : '/settings/email-accounts',
  }
}
