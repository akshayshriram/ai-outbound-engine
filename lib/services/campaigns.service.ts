import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/utils/supabase/types/database'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']
type LeadRow = Database['public']['Tables']['leads']['Row']
type CampaignLeadRow = Database['public']['Tables']['campaign_leads']['Row']

export type ListCampaignsParams = {
  page?: number
  pageSize?: number
}

export async function listCampaigns({
  page = 1,
  pageSize = 20,
}: ListCampaignsParams = {}): Promise<{
  campaigns: CampaignRow[]
  totalCount: number
}> {
  const supabase = createClient()

  const from = Math.max(page - 1, 0) * pageSize
  const to = from + pageSize - 1

  const select = 'id, name, status, created_at, org_id'

  const { data, error, count } = await supabase
    .from('campaigns')
    .select(select, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  return { campaigns: (data ?? []) as CampaignRow[], totalCount: count ?? 0 }
}

export async function getCampaignById(
  campaignId: string,
): Promise<CampaignRow> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, created_at, org_id')
    .eq('id', campaignId)
    .single()

  if (error) throw new Error(error.message)
  return data as CampaignRow
}

export type CampaignLeadRowWithLeadEmail = CampaignLeadRow & {
  leads: Pick<LeadRow, 'email'>
}

export async function listCampaignLeadsWithLeadEmail(
  campaignId: string,
): Promise<CampaignLeadRowWithLeadEmail[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('campaign_leads')
    .select('id, status, last_contacted_at, lead_id, leads(email)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []) as CampaignLeadRowWithLeadEmail[]
}

