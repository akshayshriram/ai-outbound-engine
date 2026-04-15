import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
type LeadRow = Database['public']['Tables']['leads']['Row']
type CampaignLeadRow = Database['public']['Tables']['campaign_leads']['Row']
type CampaignLeadInsert = Database['public']['Tables']['campaign_leads']['Insert']

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

export type CreateCampaignInput = {
  name: string
  status?: Database['public']['Enums']['campaign_status']
}

export async function createCampaign(input: CreateCampaignInput): Promise<CampaignRow> {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)

  const userId = authData.user?.id
  if (!userId) throw new Error('You must be logged in to create a campaign.')

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership?.org_id) throw new Error('No workspace found for this user.')

  const payload: CampaignInsert = {
    name: input.name.trim(),
    status: input.status ?? 'draft',
    org_id: membership.org_id,
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert(payload)
    .select('id, name, status, created_at, org_id')
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to create campaign.')

  return data as CampaignRow
}

export type CampaignLeadOption = Pick<
  LeadRow,
  'id' | 'email' | 'first_name' | 'last_name'
>

export async function listAvailableLeadsForCampaign(
  campaignId: string,
): Promise<CampaignLeadOption[]> {
  const supabase = createClient()

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, org_id')
    .eq('id', campaignId)
    .single()
  if (campaignError) throw new Error(campaignError.message)

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name')
    .eq('org_id', campaign.org_id)
    .order('created_at', { ascending: false })
  if (leadsError) throw new Error(leadsError.message)

  const { data: linkedRows, error: linkedRowsError } = await supabase
    .from('campaign_leads')
    .select('lead_id')
    .eq('campaign_id', campaignId)
  if (linkedRowsError) throw new Error(linkedRowsError.message)

  const linkedLeadIds = new Set((linkedRows ?? []).map((row) => row.lead_id))

  return ((leads ?? []).filter((lead) => !linkedLeadIds.has(lead.id)) ??
    []) as CampaignLeadOption[]
}

export type AddLeadToCampaignInput = {
  campaignId: string
  leadId: string
}

export async function addLeadToCampaign({
  campaignId,
  leadId,
}: AddLeadToCampaignInput): Promise<CampaignLeadRow> {
  const supabase = createClient()

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('campaign_leads')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('lead_id', leadId)
    .limit(1)
  if (existingRowsError) throw new Error(existingRowsError.message)
  if ((existingRows ?? []).length > 0) {
    throw new Error('Lead already exists in this campaign.')
  }

  const payload: CampaignLeadInsert = {
    campaign_id: campaignId,
    lead_id: leadId,
  }

  const { data, error } = await supabase
    .from('campaign_leads')
    .insert(payload)
    .select('id, campaign_id, lead_id, status, step, scheduled_at, last_contacted_at, created_at')
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to add lead to campaign.')

  return data as CampaignLeadRow
}

