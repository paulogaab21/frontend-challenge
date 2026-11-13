import { useCallback, useSyncExternalStore } from 'react'

import { useSession } from '@/features/auth/session'

import { quoteReview, type ReviewState } from './review'

/** External quote changes the collector has not acknowledged yet. */
export function useQuoteReview(): ReviewState & { accept: () => void } {
  const { scope } = useSession()
  const state = useSyncExternalStore(
    quoteReview.subscribe,
    useCallback(() => quoteReview.get(scope), [scope]),
  )
  const accept = useCallback(() => quoteReview.accept(scope), [scope])
  return { ...state, accept }
}
