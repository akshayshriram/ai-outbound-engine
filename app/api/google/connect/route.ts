import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUserOrg } from '@/lib/auth/current-org'
import { assertEncryptionKey } from '@/lib/crypto'
import { buildGoogleAuthUrl, getGoogleOAuthConfig } from '@/lib/google/oauth'
import { createOAuthState, OAUTH_STATE_COOKIE } from '@/lib/google/state'
import { createClient } from '@/lib/supabase/server'

const SETTINGS_PATH = '/settings/email-accounts'

/**
 * Step 1 of the Gmail connect flow: mint a signed state value and hand the
 * browser to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  try {
    // Fail before we send anyone to Google if we could not store the result.
    assertEncryptionKey()

    const supabase = await createClient()
    const current = await getCurrentUserOrg(supabase)

    if (!current) {
      return NextResponse.redirect(`${origin}/auth/login`)
    }

    const config = getGoogleOAuthConfig(origin)
    const returnToParam = request.nextUrl.searchParams.get('returnTo')
    const returnTo = returnToParam?.startsWith('/') ? returnToParam : SETTINGS_PATH

    const state = createOAuthState({
      userId: current.userId,
      orgId: current.orgId,
      returnTo,
    })

    const response = NextResponse.redirect(buildGoogleAuthUrl(config, { state }))

    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    })

    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start the Gmail connection.'

    return NextResponse.redirect(
      `${origin}${SETTINGS_PATH}?error=${encodeURIComponent(message)}`,
    )
  }
}
