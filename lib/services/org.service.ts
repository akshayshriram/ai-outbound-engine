import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/utils/supabase/types/database'

type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']

type OrgMemberRow = Database['public']['Tables']['org_members']['Row']
type DBClient = SupabaseClient<Database>

export type CreateOrganizationResult = {
  organization: OrganizationRow
  membership: OrgMemberRow
}

export async function createOrganization(
  name: string,
  userId: string,
  client?: DBClient,
): Promise<CreateOrganizationResult> {
  const supabase = client ?? createClient()

  const organizationId = crypto.randomUUID()
  const orgPayload: OrganizationInsert = { id: organizationId, name }

  try {
    const { data: existingMemberships, error: existingMembershipError } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (existingMembershipError) throw new Error(existingMembershipError.message)
    if ((existingMemberships ?? []).length > 0) {
      throw new Error('You already belong to a workspace.')
    }

    const { error: orgError } = await supabase.from('organizations').insert(orgPayload)

    if (orgError) throw new Error(orgError.message)

    const { error: membershipInsertError } = await supabase
      .from('org_members')
      .insert({ org_id: organizationId, user_id: userId, role: 'owner' })

    if (membershipInsertError) throw new Error(membershipInsertError.message)

    const { data: membership, error: memberError } = await supabase
      .from('org_members')
      .select('id, org_id, user_id, role, created_at')
      .eq('org_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('Failed to create organization membership')

    const { data: organization, error: organizationReadError } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .eq('id', organizationId)
      .single()

    if (organizationReadError) throw new Error(organizationReadError.message)
    if (!organization) throw new Error('Failed to load organization')

    return { organization: organization as OrganizationRow, membership: membership as OrgMemberRow }
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : 'Unable to create workspace')
  }
}

export type UserOrgMembership = OrgMemberRow & {
  organizations: OrganizationRow
}

export async function getUserOrganizations(
  userId: string,
  client?: DBClient,
): Promise<UserOrgMembership[]> {
  const supabase = client ?? createClient()

  try {
    const { data, error } = await supabase
      .from('org_members')
      .select('id, org_id, user_id, role, created_at, organizations(id, name, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Supabase types cannot infer joined relations precisely here.
    return (data ?? []) as unknown as UserOrgMembership[]
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : 'Unable to load workspaces')
  }
}

