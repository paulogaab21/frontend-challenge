import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useSyncExternalStore } from 'react'

import {
  quoteStaleDetailsSchema,
  type CreateOrderInput,
  type NetworkId,
  type Order,
  type Quote,
} from '@/contracts'
import { isCurrentScope, useSession } from '@/features/auth/session'
import { adoptQuote, refreshCart } from '@/features/cart/queries'
import { quoteReview } from '@/features/cart/review'
import * as ordersApi from '@/features/orders/api'
import { toFormFailure, type FormFailure } from '@/lib/form-errors'
import { errorMessage, isApiError, isTransientError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import { realtime } from '@/lib/realtime/client'
import { sessionStore } from '@/lib/session-store'

import { purchaseAttempt, type PurchaseAttempt } from './attempt-store'
import { checkoutDraft } from './draft-store'

/** Everything that can come out of one attempt to place the order. */
export type PlaceOrderOutcome =
  /** The order exists (just created, or recovered from an earlier request). */
  | { kind: 'created'; order: Order }
  /** Prices, stock, coupon or fees changed: the collector must confirm again. */
  | { kind: 'stale'; quote: Quote }
  /** Another order of this collector is still waiting for confirmation. */
  | { kind: 'pending-order'; orderId: string | null }
  | { kind: 'wallet-disconnected' }
  | { kind: 'cart-empty' }
  /** The API refused the collector data; errors map onto the form. */
  | { kind: 'invalid'; failure: FormFailure }
  /** No answer arrived: the order may or may not exist. Safe to retry. */
  | { kind: 'unknown'; message: string }
  | { kind: 'session-expired' }
  | { kind: 'failed'; message: string }

function orderIdFrom(details: unknown): string | null {
  const orderId = (details as { orderId?: unknown } | null)?.orderId
  return typeof orderId === 'string' ? orderId : null
}

/**
 * Sends the purchase and classifies the answer.
 *
 * Duplicate protection, in layers:
 * 1. the UI disables the action while a request is in flight, and a synchronous
 *    lock drops a second call that slips in before the re-render;
 * 2. every request of the same attempt carries the same `Idempotency-Key` and the
 *    same body (see attempt-store), so the API returns the order it already
 *    created — after a double click, a timeout or a page reload alike;
 * 3. the API refuses a second order while one is pending (`ORDER_PENDING`).
 *
 * An attempt is forgotten only after a *definitive* answer. A timeout, a lost
 * connection or a 5xx leave it stored as "unknown", ready to be sent again.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const lock = useRef(false)

  const mutation = useMutation({
    mutationKey: ['place-order', scope],
    mutationFn: async (request: CreateOrderInput): Promise<PlaceOrderOutcome> => {
      const userId = sessionStore.getUserId()
      if (!userId) return { kind: 'session-expired' }

      const attempt = purchaseAttempt.begin(userId, request)
      try {
        const { order } = await ordersApi.createOrder(attempt.request, attempt.key)
        purchaseAttempt.clear()
        return { kind: 'created', order }
      } catch (error) {
        if (isTransientError(error)) {
          purchaseAttempt.markUnknown()
          return { kind: 'unknown', message: errorMessage(error) }
        }

        // From here on the API gave a definitive answer: this attempt is over.
        purchaseAttempt.clear()
        if (!isApiError(error)) return { kind: 'failed', message: errorMessage(error) }
        if (error.status === 401) return { kind: 'session-expired' }

        switch (error.code) {
          case 'QUOTE_STALE': {
            const details = quoteStaleDetailsSchema.safeParse(error.details)
            return details.success
              ? { kind: 'stale', quote: details.data.quote }
              : { kind: 'failed', message: error.message }
          }
          case 'ORDER_PENDING':
            return { kind: 'pending-order', orderId: orderIdFrom(error.details) }
          case 'WALLET_DISCONNECTED':
            return { kind: 'wallet-disconnected' }
          case 'CART_EMPTY':
            return { kind: 'cart-empty' }
          case 'VALIDATION_ERROR':
            return { kind: 'invalid', failure: toFormFailure(error, 'collector.') }
          default:
            return { kind: 'failed', message: error.message }
        }
      }
    },

    onSuccess: (outcome, request) => {
      if (!isCurrentScope(scope)) return
      const network: NetworkId = request.collector.network

      switch (outcome.kind) {
        case 'created': {
          const { order } = outcome
          realtime.observe('order', order.id, order.version)
          queryClient.setQueryData(queryKeys.private.order(scope, order.id), order)
          void queryClient.invalidateQueries({ queryKey: queryKeys.private.orders(scope) })
          // Stock is now reserved (or the purchase already settled).
          void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
          void refreshCart(queryClient, scope)
          checkoutDraft.clear()
          break
        }
        case 'stale':
          // Show the new values at once and record what changed for the review.
          adoptQuote(queryClient, scope, network, outcome.quote)
          quoteReview.observe(scope, outcome.quote)
          void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(scope) })
          void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
          break
        case 'pending-order':
          void queryClient.invalidateQueries({ queryKey: queryKeys.private.orders(scope) })
          break
        case 'wallet-disconnected':
          void queryClient.invalidateQueries({ queryKey: queryKeys.private.connection(scope) })
          break
        case 'cart-empty':
          void refreshCart(queryClient, scope)
          break
        default:
          break
      }
    },
  })

  const { mutateAsync } = mutation
  /** Sends `request`; a call made while another is in flight is dropped. */
  const place = useCallback(
    async (request: CreateOrderInput): Promise<PlaceOrderOutcome | null> => {
      if (lock.current) return null
      lock.current = true
      try {
        return await mutateAsync(request)
      } finally {
        lock.current = false
      }
    },
    [mutateAsync],
  )

  return { place, isPending: mutation.isPending }
}

/** The stored attempt of the current user whose outcome is still unknown. */
export function useUnresolvedAttempt(): PurchaseAttempt | null {
  const userId = useSyncExternalStore(sessionStore.subscribe, sessionStore.getUserId)
  const getSnapshot = useCallback(() => purchaseAttempt.peek(userId), [userId])
  return useSyncExternalStore(purchaseAttempt.subscribe, getSnapshot)
}
