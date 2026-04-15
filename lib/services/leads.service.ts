import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']
type LeadInsert = Database['public']['Tables']['leads']['Insert']

export type ListLeadsParams = {
  search?: string
  page?: number
  pageSize?: number
}

export async function listLeads({
  search = '',
  page = 1,
  pageSize = 10,
}: ListLeadsParams): Promise<{ leads: LeadRow[]; totalCount: number }> {
  const supabase = createClient()

  const from = Math.max(page - 1, 0) * pageSize
  const to = from + pageSize - 1

  const select =
    'id, first_name, last_name, email, company, status, created_at, updated_at'

  let query = supabase
    .from('leads')
    .select(select, { count: 'exact' })
    .order('created_at', { ascending: false })

  const trimmed = search.trim()
  if (trimmed.length > 0) {
    // Search across a few common lead fields.
    query = query.or(
      [
        `first_name.ilike.%${trimmed}%`,
        `last_name.ilike.%${trimmed}%`,
        `email.ilike.%${trimmed}%`,
        `company.ilike.%${trimmed}%`,
      ].join(','),
    )
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  return { leads: (data ?? []) as LeadRow[], totalCount: count ?? 0 }
}

export type CreateLeadInput = {
  firstName?: string
  lastName?: string
  email: string
  company?: string
}

export async function createLead(input: CreateLeadInput): Promise<LeadRow> {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)

  const userId = authData.user?.id
  if (!userId) throw new Error('You must be logged in to create a lead.')

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership?.org_id) throw new Error('No workspace found for this user.')

  const payload: LeadInsert = {
    org_id: membership.org_id,
    email: input.email.trim(),
    first_name: input.firstName?.trim() || null,
    last_name: input.lastName?.trim() || null,
    company: input.company?.trim() || null,
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select('id, first_name, last_name, email, company, status, created_at, updated_at, org_id')
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to create lead.')

  return data as LeadRow
}

