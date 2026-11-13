import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import type { OrderStatus } from '@/contracts'
import { useSession } from '@/features/auth/session'
import { queryKeys } from '@/lib/query-keys'
import { realtime } from '@/lib/realtime/client'

import * as api from './api'

/** While the socket is down a pending order is polled at this interval. */
const PENDING_POLL_MS = 5_000

export function orderQueryOptions(scope: string, orderId: string) {
  return queryOptions({
    queryKey: queryKeys.private.order(scope, orderId),
    queryFn: async ({ signal }) => {
      const order = await api.fetchOrder(orderId, signal)
      // Raise the event floor: an older `order.updated` can no longer be applied.
      realtime.observe('order', order.id, order.version)
      return order
    },
    // A settled order never changes again: no point in refetching it.
    staleTime: (query) =>
      query.state.data && query.state.data.status !== 'pending' ? Infinity : 0,
  })
}

export type RealtimeStatus = 'connected' | 'reconnecting'

export function useRealtimeStatus(): RealtimeStatus {
  const status = useSyncExternalStore(realtime.status.subscribe, realtime.status.get)
  return status === 'connected' ? 'connected' : 'reconnecting'
}

/**
 * One order, kept current by three mechanisms:
 * 1. `order.updated` events patch the cache as they arrive (see realtime sync);
 * 2. when the socket reconnects, active queries are refetched;
 * 3. while the socket is down and the order is still pending, it is polled.
 */
export function useOrder(orderId: string) {
  const { scope } = useSession()
  const realtimeStatus = useRealtimeStatus()
  return useQuery({
    ...orderQueryOptions(scope, orderId),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && realtimeStatus !== 'connected'
        ? PENDING_POLL_MS
        : false,
  })
}

export function ordersQueryOptions(scope: string, status?: OrderStatus) {
  return queryOptions({
    queryKey: [...queryKeys.private.orders(scope), 'list', status ?? 'all'] as const,
    queryFn: async ({ signal }) => {
      const page = await api.fetchOrders({ status }, signal)
      for (const order of page.items) realtime.observe('order', order.id, order.version)
      return page
    },
    staleTime: 0,
  })
}

export function useOrders(status?: OrderStatus) {
  const { isAuthenticated, scope } = useSession()
  return useQuery({ ...ordersQueryOptions(scope, status), enabled: isAuthenticated })
}

/**
 * Orders still waiting for confirmation. The checkout refuses to start another
 * purchase while one exists — that is what makes "refresh / come back later" safe.
 */
export function usePendingOrders() {
  return useOrders('pending')
}

export function transactionQueryOptions(scope: string, hash: string) {
  return queryOptions({
    queryKey: queryKeys.private.transaction(scope, hash),
    queryFn: ({ signal }) => api.fetchTransaction(hash, signal),
    staleTime: Infinity,
  })
}
