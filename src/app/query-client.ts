import { QueryClient } from '@tanstack/react-query'

/**
 * Cache policy (documented in ARCHITECTURE.md > Cache):
 * - staleTime 30s: lists/details are refreshed in the background, never blocking the UI;
 *   real-time events (Socket.IO) patch the cache in between.
 * - gcTime 5min: navigating back restores the previous screen instantly.
 * - retry: only idempotent reads retry, and only on transient failures. Mutations never
 *   retry automatically — recovery is explicit (idempotency keys, user-driven retry).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
