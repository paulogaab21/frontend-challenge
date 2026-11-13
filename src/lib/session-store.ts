import { createStore, randomId, readJson, removeKey, writeJson } from './storage'

/**
 * Credentials of the current session, kept outside React so the transport layers
 * (Axios interceptors, Socket.IO handshake) can read them synchronously.
 *
 * Only the opaque bearer token and its metadata are stored — never the password.
 * The user object itself lives in the TanStack Query cache (see features/auth).
 */

const SESSION_KEY = 'kurio.session'
const CART_TOKEN_KEY = 'kurio.cart-token'

export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

export type SessionEndReason = 'logout' | 'expired'

const store = createStore<StoredSession | null>(readJson<StoredSession>(SESSION_KEY))
const endListeners = new Set<(reason: SessionEndReason, previous: StoredSession) => void>()

export const sessionStore = {
  get: store.get,
  subscribe: store.subscribe,

  getToken(): string | null {
    return store.get()?.token ?? null
  },

  getUserId(): string | null {
    return store.get()?.userId ?? null
  },

  start(session: StoredSession): void {
    writeJson(SESSION_KEY, session)
    store.set(session)
  },

  /** Clears the credentials and tells subscribers why the session ended. */
  end(reason: SessionEndReason): void {
    const previous = store.get()
    if (!previous) return
    removeKey(SESSION_KEY)
    store.set(null)
    endListeners.forEach((listener) => listener(reason, previous))
  },

  /** Ends the session only if `token` is still the active one (ignores late 401s). */
  expire(token: string | null): void {
    if (token && store.get()?.token === token) this.end('expired')
  },

  onEnd(listener: (reason: SessionEndReason, previous: StoredSession) => void): () => void {
    endListeners.add(listener)
    return () => {
      endListeners.delete(listener)
    }
  },
}

/**
 * Identifies the visitor's cart before authentication. It is sent as the
 * `X-Cart-Token` header; when a session starts the API merges that cart into the
 * user's cart and the token is discarded.
 */
const cartToken = createStore<string | null>(readJson<string>(CART_TOKEN_KEY))

export const cartTokenStore = {
  get: cartToken.get,
  subscribe: cartToken.subscribe,

  /** Returns the visitor token, creating it on first use. */
  ensure(): string {
    const current = cartToken.get()
    if (current) return current
    const created = randomId()
    writeJson(CART_TOKEN_KEY, created)
    cartToken.set(created)
    return created
  },

  clear(): void {
    removeKey(CART_TOKEN_KEY)
    cartToken.set(null)
  },
}

/**
 * Cache scope of the private data on screen: `user:<id>` for an authenticated
 * session, `guest:<token>` for a visitor. Part of every private query key, so data
 * of two identities can never share a cache entry.
 */
export function currentScope(): string {
  const userId = sessionStore.getUserId()
  return userId ? `user:${userId}` : `guest:${cartTokenStore.ensure()}`
}
