import { type CollectorInput } from '@/contracts'
import { readJson, removeKey, writeJson } from '@/lib/storage'

/**
 * What the collector typed at checkout, kept for the duration of the tab so the
 * flow can be resumed: after a refresh, and after signing in again when the
 * session expires in the middle of the purchase.
 *
 * The draft belongs to one user. It is restored only for that user and it is
 * erased on sign out and once the order is placed.
 */

const STORAGE_KEY = 'kurio.checkout.draft'

/** `other` = a wallet typed for this purchase instead of a registered one. */
export type WalletChoice = string | 'other'

export interface CheckoutDraft {
  userId: string
  values: CollectorInput
  walletChoice: WalletChoice
  savedAt: string
}

export const checkoutDraft = {
  get(userId: string | null): CheckoutDraft | null {
    const draft = readJson<CheckoutDraft>(STORAGE_KEY, 'session')
    if (!draft) return null
    if (draft.userId !== userId) {
      removeKey(STORAGE_KEY, 'session')
      return null
    }
    return draft
  },

  save(userId: string, values: CollectorInput, walletChoice: WalletChoice): void {
    writeJson(
      STORAGE_KEY,
      { userId, values, walletChoice, savedAt: new Date().toISOString() } satisfies CheckoutDraft,
      'session',
    )
  },

  clear(): void {
    removeKey(STORAGE_KEY, 'session')
  },
}
