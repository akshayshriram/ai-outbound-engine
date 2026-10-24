'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  disconnectEmailAccount,
  listEmailAccounts,
  type ConnectedEmailAccount,
} from '@/lib/services/email-accounts.service'

export function useEmailAccounts() {
  const query = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => listEmailAccounts(),
    retry: 1,
    staleTime: 30_000,
  })

  return {
    accounts: (query.data ?? []) as ConnectedEmailAccount[],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useDisconnectEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => disconnectEmailAccount(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['email-accounts'] })
    },
  })
}
