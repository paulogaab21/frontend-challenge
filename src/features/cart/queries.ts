import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { type AddCartItemRequest, type Cart, type NetworkId, type Quote } from '@/contracts'
import { isCurrentScope, useSession } from '@/features/auth/session'
import { isApiError } from '@/lib/http'
import { mulEth } from '@/lib/money'
import { queryKeys } from '@/lib/query-keys'

import * as api from './api'
import { quoteReview } from './review'

/**
 * Cart state
 * - The cart lives on the server, for visitors (X-Cart-Token) and sessions alike;
 *   the client only caches it under the scope of the current identity.
 * - Every mutation answers with the whole cart, which replaces the cache entry.
 * - Monetary totals are never computed here: they come from the quote (POST /quotes).
 */

export function cartQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.cart(scope),
    queryFn: ({ signal }) => api.fetchCart(signal),
    staleTime: 15_000,
  })
}

export function useCart() {
  const { scope } = useSession()
  return useQuery(cartQueryOptions(scope))
}

/** Number shown on the cart badge (sum of quantities). */
export function useCartCount(): number {
  return useCart().data?.itemCount ?? 0
}

/* -------------------------------------------------------------------------- */
/* Quote                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The priced snapshot of the cart. Keyed by network and cart version: a change
 * made by the collector produces a new entry, while a change that comes from the
 * catalog (price, stock, coupon expiry) refreshes the same entry — that is how the
 * review logic tells the two apart (see ./review).
 */
export function quoteQueryOptions(scope: string, network: NetworkId, cart: Cart | undefined) {
  return queryOptions({
    queryKey: queryKeys.private.quote(scope, network, cart?.version ?? 0),
    queryFn: ({ signal }) =>
      api.createQuote(
        { network, previousFingerprint: quoteReview.acknowledged(scope, network)?.fingerprint },
        signal,
      ),
    enabled: cart !== undefined && cart.items.length > 0,
    // A quote is only as good as the catalog it was computed from: always refresh
    // it when a screen that shows money is opened.
    staleTime: 0,
  })
}

export function useQuote(network: NetworkId) {
  const { scope } = useSession()
  const cart = useCart().data
  return useQuery({
    ...quoteQueryOptions(scope, network, cart),
    placeholderData: keepPreviousData,
  })
}

/** Marks cart and quotes as stale and refetches the ones on screen. */
export function refreshCart(queryClient: QueryClient, scope: string): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(scope) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.private.quotes(scope) }),
  ]).then(() => undefined)
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

const cartMutationKey = (scope: string) => ['cart', scope] as const

/**
 * Cart mutations run one at a time (same mutation scope), so answers are applied
 * in the order the collector acted. While several are queued only the last answer
 * is written to the cache: earlier ones describe a state already superseded.
 */
function useCartMutation<Input>(
  mutationFn: (input: Input) => Promise<Cart>,
  optimistic?: (cart: Cart, input: Input) => Cart,
) {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.private.cart(scope)
  const mutationKey = cartMutationKey(scope)

  return useMutation({
    mutationKey,
    scope: { id: `cart:${scope}` },
    mutationFn,

    onMutate: async (input) => {
      if (!optimistic) return undefined
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData<Cart>(key, optimistic(previous, input))
      return { previous }
    },

    onSuccess: (cart) => {
      if (!isCurrentScope(scope)) return
      // The next quote reflects what the collector just did, not an outside change.
      quoteReview.markUserChange(scope)
      if (queryClient.isMutating({ mutationKey }) <= 1) queryClient.setQueryData(key, cart)
    },

    onError: (error, _input, context) => {
      if (!isCurrentScope(scope)) return
      if (context?.previous && queryClient.isMutating({ mutationKey }) <= 1) {
        queryClient.setQueryData(key, context.previous)
      }
      // A stock conflict means what the client knew is outdated: resynchronize.
      if (isApiError(error, ['INSUFFICIENT_AVAILABILITY', 'EDITION_UNAVAILABLE', 'NOT_FOUND'])) {
        void refreshCart(queryClient, scope)
        void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
      }
    },
  })
}

function recount(cart: Cart, items: Cart['items']): Cart {
  return { ...cart, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }
}

export function useAddToCart() {
  return useCartMutation((input: AddCartItemRequest) => api.addCartItem(input))
}

/** Optimistic: the stepper and the line total react immediately. */
export function useUpdateCartItem() {
  return useCartMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.updateCartItem(itemId, quantity),
    (cart, { itemId, quantity }) =>
      recount(
        cart,
        cart.items.map((item) =>
          item.id === itemId
            ? { ...item, quantity, lineTotal: mulEth(item.unitPrice, quantity) }
            : item,
        ),
      ),
  )
}

/** Optimistic: the line disappears at once and comes back if the API refuses. */
export function useRemoveCartItem() {
  return useCartMutation(
    ({ itemId }: { itemId: string }) => api.removeCartItem(itemId),
    (cart, { itemId }) =>
      recount(
        cart,
        cart.items.filter((item) => item.id !== itemId),
      ),
  )
}

export function useApplyCoupon() {
  return useCartMutation(({ code }: { code: string }) => api.applyCoupon(code))
}

export function useRemoveCoupon() {
  return useCartMutation((_input: void) => api.removeCoupon())
}

/** Puts a quote the API sent with an error (409 QUOTE_STALE) into the cache. */
export function adoptQuote(
  queryClient: QueryClient,
  scope: string,
  network: NetworkId,
  quote: Quote,
): void {
  const cart = queryClient.getQueryData<Cart>(queryKeys.private.cart(scope))
  queryClient.setQueryData(queryKeys.private.quote(scope, network, cart?.version ?? 0), quote)
}
