'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createLead,
  listLeads,
  type CreateLeadInput,
  type ListLeadsParams,
} from '@/lib/services/leads.service'
import type { Database } from '@/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

export function useLeads({
  search = '',
  page = 1,
  pageSize = 10,
}: ListLeadsParams = {}) {
  const query = useQuery({
    queryKey: ['leads', { search, page, pageSize }],
    queryFn: async () => {
      const res = await listLeads({ search, page, pageSize })
      return res
    },
    placeholderData: (prevData) => prevData,
    retry: 1,
    staleTime: 30_000,
  })

  const leads = (query.data?.leads ?? []) as LeadRow[]

  return {
    leads,
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    page,
    pageSize,
    refetch: query.refetch,
  }
}

export function useCreateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => createLead(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

