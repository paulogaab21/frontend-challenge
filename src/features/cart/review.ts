import { type NetworkId, type Quote, type QuoteIssue } from '@/contracts'
import { createStore } from '@/lib/storage'

/**
 * Tracks which quote changes the collector still has to acknowledge.
 *
 * A quote can change for two reasons:
 * - the collector changed the cart (quantity, removal, coupon, network) — expected,
 *   nothing to acknowledge;
 * - the world changed (price, stock, coupon expiry, network fee) — the collector
 *   must be told and, at checkout, must accept the new values before paying.
 *
 * The store keeps, per identity, the fingerprint of the last quote seen for each
 * network (the *baseline*) and the list of changes not yet accepted. A quote whose
 * fingerprint differs from the baseline, without a cart change by the collector
 * in between, is an external change.
 */

export interface ReviewState {
  baseline: Partial<Record<NetworkId, string>>
  changes: QuoteIssue[]
}

const EMPTY: ReviewState = Object.freeze({ baseline: {}, changes: [] })

const store = createStore<Record<string, ReviewState>>({})

function update(scope: string, next: ReviewState): void {
  store.set({ ...store.get(), [scope]: next })
}

function changeKey(issue: QuoteIssue): string {
  return `${issue.type}:${issue.itemId ?? ''}`
}

/**
 * Folds new issues into the pending ones. For the same subject (e.g. the price of
 * one item) the oldest "before" and the newest "after" are kept; a change that
 * ends where it started cancels out.
 */
function mergeChanges(pending: QuoteIssue[], incoming: QuoteIssue[]): QuoteIssue[] {
  const merged = new Map(pending.map((issue) => [changeKey(issue), issue]))
  for (const issue of incoming) {
    const key = changeKey(issue)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, issue)
    } else if (existing.previous !== undefined && existing.previous === issue.current) {
      merged.delete(key)
    } else {
      merged.set(key, { ...issue, previous: existing.previous ?? issue.previous })
    }
  }
  return [...merged.values()]
}

const GENERIC_CHANGE: QuoteIssue = {
  type: 'price_changed',
  blocking: false,
  message: 'Os valores do seu pedido foram atualizados.',
}

export const quoteReview = {
  subscribe: store.subscribe,

  get(scope: string): ReviewState {
    return store.get()[scope] ?? EMPTY
  },

  /** Fingerprint of the last quote seen for a network; sent as `previousFingerprint`. */
  acknowledged(scope: string, network?: NetworkId): { fingerprint: string } | undefined {
    const baseline = this.get(scope).baseline
    const fingerprint = network ? baseline[network] : Object.values(baseline)[0]
    return fingerprint ? { fingerprint } : undefined
  },

  /** The collector changed the cart: the next quote is what they asked for. */
  markUserChange(scope: string): void {
    const state = this.get(scope)
    if (Object.keys(state.baseline).length === 0) return
    update(scope, { ...state, baseline: {} })
  },

  /** Registers a fresh quote and records what changed since the baseline. */
  observe(scope: string, quote: Quote): void {
    const state = this.get(scope)
    const known = state.baseline[quote.network]
    if (known === quote.fingerprint) return

    const baseline = { ...state.baseline, [quote.network]: quote.fingerprint }
    if (known === undefined) {
      update(scope, { ...state, baseline })
      return
    }

    const informative = quote.issues.filter((issue) => !issue.blocking)
    const hasBlockers = quote.issues.some((issue) => issue.blocking)
    // Blocking issues are shown on their own; they need no separate acknowledgment.
    const incoming = informative.length > 0 ? informative : hasBlockers ? [] : [GENERIC_CHANGE]
    update(scope, { baseline, changes: mergeChanges(state.changes, incoming) })
  },

  /** The collector accepted the current values. */
  accept(scope: string): void {
    const state = this.get(scope)
    if (state.changes.length === 0) return
    update(scope, { ...state, changes: [] })
  },

  /** Forgets everything (used when the identity changes). */
  reset(): void {
    store.set({})
  },
}
