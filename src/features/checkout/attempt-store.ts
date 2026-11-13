import type { CreateOrderInput } from '@/contracts'
import { isDeepEqual } from '@/lib/stable-json'
import { createStore, randomId, readJson, removeKey, writeJson } from '@/lib/storage'

/**
 * The purchase attempt in progress, persisted so it survives a refresh.
 *
 * One attempt = one Idempotency-Key + the exact body sent with it. As long as the
 * outcome of an attempt is not known, every retry (a second click, "Tentar
 * novamente" after a timeout, a reload in the middle of the request) re-sends that
 * same pair, and the API answers with the same order instead of creating another.
 *
 * A new key is generated only when the body changes — which the checkout allows
 * only after the previous attempt got a definitive answer.
 *
 * Kept in sessionStorage: it holds the collector's data and must not outlive the
 * tab. If it is lost, the "pending order" guard of the checkout still prevents a
 * second purchase.
 */

const STORAGE_KEY = 'kurio.checkout.attempt'

export interface PurchaseAttempt {
  /** Value of the Idempotency-Key header. */
  key: string
  /** Owner. An attempt is never replayed under another identity. */
  userId: string
  request: CreateOrderInput
  /**
   * - `sending`  a request is in flight in this page;
   * - `unknown`  a request ended without an answer (timeout, connection lost, or
   *              the page was closed/reloaded while it was in flight): the order
   *              may or may not have been created.
   */
  status: 'sending' | 'unknown'
  createdAt: string
}

/**
 * A request cannot still be in flight when the page loads: whatever was being sent
 * when the page went away is an attempt whose outcome is unknown.
 */
function loadAttempt(): PurchaseAttempt | null {
  const stored = readJson<PurchaseAttempt>(STORAGE_KEY, 'session')
  if (stored?.status !== 'sending') return stored
  const interrupted: PurchaseAttempt = { ...stored, status: 'unknown' }
  writeJson(STORAGE_KEY, interrupted, 'session')
  return interrupted
}

const store = createStore<PurchaseAttempt | null>(loadAttempt())

function persist(attempt: PurchaseAttempt | null): void {
  if (attempt) writeJson(STORAGE_KEY, attempt, 'session')
  else removeKey(STORAGE_KEY, 'session')
  store.set(attempt)
}

export const purchaseAttempt = {
  subscribe: store.subscribe,

  /** Read-only variant of `get`, safe to use as a render-time snapshot. */
  peek(userId: string | null): PurchaseAttempt | null {
    const attempt = store.get()
    return attempt && attempt.userId === userId ? attempt : null
  },

  /** The unresolved attempt of `userId`, if any. Someone else's is discarded. */
  get(userId: string | null): PurchaseAttempt | null {
    const attempt = store.get()
    if (!attempt) return null
    if (attempt.userId !== userId) {
      persist(null)
      return null
    }
    return attempt
  },

  /**
   * Starts (or resumes) the attempt for `request`. The key is reused when the body
   * is the same as the unresolved attempt's, so repeating the action is harmless.
   */
  begin(userId: string, request: CreateOrderInput): PurchaseAttempt {
    const current = this.get(userId)
    const attempt: PurchaseAttempt =
      current && isDeepEqual(current.request, request)
        ? { ...current, status: 'sending' }
        : {
            key: randomId(),
            userId,
            request,
            status: 'sending',
            createdAt: new Date().toISOString(),
          }
    persist(attempt)
    return attempt
  },

  /** The request ended without an answer: keep the attempt for a safe retry. */
  markUnknown(): void {
    const attempt = store.get()
    if (attempt) persist({ ...attempt, status: 'unknown' })
  },

  /** The attempt got a definitive answer (an order, or a refusal). */
  clear(): void {
    persist(null)
  },
}
