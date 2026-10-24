import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUserOrg } from '@/lib/auth/current-org'
import { decryptSecret } from '@/lib/crypto'
import { revokeGoogleToken } from '@/lib/google/oauth'
import { createClient } from '@/lib/supabase/server'

type DisconnectRequest = {
  id?: string
}

/** Revokes the grant at Google (best effort) and removes the stored mailbox. */
export async function POST(request: NextRequest) {
  try {
    const { id } = (await request.json()) as DisconnectRequest

    if (!id) {
      return NextResponse.json({ error: 'An account id is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const current = await getCurrentUserOrg(supabase)

    if (!current) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: account, error: readError } = await supabase
      .from('email_accounts')
      .select('id, refresh_token, access_token')
      .eq('id', id)
      .eq('org_id', current.orgId)
      .eq('user_id', current.userId)
      .maybeSingle()

    if (readError) {
      throw new Error(readError.message)
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    // Revoking the refresh token drops the whole grant; fall back to the access
    // token. A failure here must not block removing our own copy.
    const envelope = account.refresh_token ?? account.access_token

    if (envelope) {
      try {
        await revokeGoogleToken(decryptSecret(envelope))
      } catch {
        // Undecryptable or already revoked — delete the row regardless.
      }
    }

    const { error: deleteError } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', account.id)
      .eq('org_id', current.orgId)
      .eq('user_id', current.userId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to disconnect the account.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
