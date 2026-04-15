'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addLeadToCampaign,
  createCampaign,
  listAvailableLeadsForCampaign,
  listCampaigns,
  type AddLeadToCampaignInput,
  type CampaignLeadOption,
  type CreateCampaignInput,
  type ListCampaignsParams,
} from '@/lib/services/campaigns.service'
import type { Database } from '@/types/database'

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

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => createCampaign(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useAvailableLeadsForCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-available-leads', campaignId],
    queryFn: () => listAvailableLeadsForCampaign(campaignId),
    enabled: !!campaignId,
    retry: 1,
    staleTime: 30_000,
    placeholderData: (prevData) => prevData,
  })
}

export function useAddLeadToCampaign(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<AddLeadToCampaignInput, 'campaignId'>) =>
      addLeadToCampaign({ campaignId, ...input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign-leads', campaignId] }),
        queryClient.invalidateQueries({
          queryKey: ['campaign-available-leads', campaignId],
        }),
      ])
    },
  })
}

export type { CampaignLeadOption }

