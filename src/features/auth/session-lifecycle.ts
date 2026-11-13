import type { QueryClient } from '@tanstack/react-query'

import { quoteReview } from '@/features/cart/review'
import { purchaseAttempt } from '@/features/checkout/attempt-store'
import { checkoutDraft } from '@/features/checkout/draft-store'
import { queryKeys } from '@/lib/query-keys'
import { sessionStore } from '@/lib/session-store'

/**
 * What happens to private data when a session ends, for any reason (sign out,
 * expiry reported by the API, sign out in another tab):
 *
 * - requests of the previous user still in flight are cancelled and every cache
 *   entry under that user's scope is removed — nothing of it can be rendered again;
 * - pending "your cart changed" acknowledgments are dropped;
 * - the realtime client (bound to the session store on its own) closes the socket
 *   of the previous identity and opens a new one.
 *
 * The checkout context (form draft + purchase attempt) is treated differently by
 * reason: an *expired* session keeps it, so the purchase can be resumed after
 * signing in again as the same user; an explicit *sign out* erases it.
 */
export function bindSessionLifecycle(queryClient: QueryClient): () => void {
  return sessionStore.onEnd((reason, previous) => {
    const scopeKey = queryKeys.private.scope(`user:${previous.userId}`)
    void queryClient.cancelQueries({ queryKey: scopeKey })
    queryClient.removeQueries({ queryKey: scopeKey })
    quoteReview.reset()

    if (reason === 'logout') {
      checkoutDraft.clear()
      purchaseAttempt.clear()
    }
  })
}
