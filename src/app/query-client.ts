import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { isTransientError } from '@/lib/http'

/**
 * Cache, retry and synchronization policy (see ARCHITECTURE.md > "Cache").
 *
 * Queries
 * - staleTime 30 s — data is served from cache and refreshed in the background; in
 *   between, Socket.IO events patch prices, stock and order status in place.
 * - gcTime 5 min — going back to a screen restores it instantly.
 * - retry — one automatic retry, only for transient failures (no connection,
 *   timeout, 5xx), after 1 s. 4xx answers are final: retrying cannot change them.
 *   After that the screen shows the error with an explicit "Tentar novamente".
 * - refetch on window focus and on network reconnect; the realtime layer also
 *   invalidates active queries when the socket reconnects.
 *
 * Mutations
 * - never retried automatically: a blind replay could duplicate an operation.
 *   The purchase is the one flow that must survive a lost answer, and it does so
 *   explicitly, by re-sending the same Idempotency-Key.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
        retryDelay: 1_000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
