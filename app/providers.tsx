'use client'

import * as React from 'react'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 30_000,
          refetchOnWindowFocus: false,
        },
      },
    })
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

