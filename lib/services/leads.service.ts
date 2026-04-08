import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/utils/supabase/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

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

