import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export type CurrentUserOrg = {
  userId: string
  orgId: string
}

/**
 * Resolves the signed-in user and the org their records belong to. Mirrors the
 * "first membership wins" rule already used by the campaign routes — there is
 * no org switcher yet.
 */
export async function getCurrentUserOrg(
  supabase: SupabaseClient<Database>,
): Promise<CurrentUserOrg | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) return null

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership) return null

  return { userId: authData.user.id, orgId: membership.org_id }
}
