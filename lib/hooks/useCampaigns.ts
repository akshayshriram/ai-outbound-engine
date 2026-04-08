'use client'

import { useQuery } from '@tanstack/react-query'

import {
  listCampaigns,
  type ListCampaignsParams,
} from '@/lib/services/campaigns.service'
import type { Database } from '@/utils/supabase/types/database'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']

export function useCampaigns({ page = 1, pageSize = 20 }: ListCampaignsParams = {}) {
  const query = useQuery({
    queryKey: ['campaigns', { page, pageSize }],
    queryFn: () => listCampaigns({ page, pageSize }),
    retry: 1,
    staleTime: 30_000,
    placeholderData: (prevData) => prevData,
  })

  const campaigns = (query.data?.campaigns ?? []) as CampaignRow[]

  return {
    campaigns,
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    page,
    pageSize,
    refetch: query.refetch,
  }
}

