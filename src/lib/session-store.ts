import { createStore, randomId, readJson, removeKey, writeJson } from './storage'

/**
 * Identity of whoever is using the app, kept outside React so the transport layers
 * (Axios interceptors, Socket.IO handshake) can read it synchronously.
 *
 * - A signed-in collector has a *session*: an opaque bearer token plus metadata.
 *   Only the token is stored — never the password. The user object itself is
 *   server state and lives in the TanStack Query cache (see features/auth).
 * - A visitor has a *cart token*, sent as `X-Cart-Token`, that identifies the cart
 *   before authentication. When a session starts the API merges that cart into
 *   the account and the token is discarded; when the session ends a new one is
 *   issued. There is always exactly one identity.
 */

const SESSION_KEY = 'kurio.session'
const CART_TOKEN_KEY = 'kurio.cart-token'

export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

export type SessionEndReason = 'logout' | 'expired'

type EndListener = (reason: SessionEndReason, previous: StoredSession) => void

const cartToken = createStore<string | null>(readJson<string>(CART_TOKEN_KEY))
const session = createStore<StoredSession | null>(readJson<StoredSession>(SESSION_KEY))
const endListeners = new Set<EndListener>()

function ensureCartToken(): string {
  const current = cartToken.get()
  if (current) return current
  const created = randomId()
  writeJson(CART_TOKEN_KEY, created)
  cartToken.set(created)
  return created
}

// A visitor always has an identity.
if (!session.get()) ensureCartToken()

export const cartTokenStore = {
  get: cartToken.get,
  subscribe: cartToken.subscribe,
  ensure: ensureCartToken,

  clear(): void {
    removeKey(CART_TOKEN_KEY)
    cartToken.set(null)
  },
}

export const sessionStore = {
  get: session.get,
  subscribe: session.subscribe,

  getToken(): string | null {
    return session.get()?.token ?? null
  },

  getUserId(): string | null {
    return session.get()?.userId ?? null
  },

  start(next: StoredSession): void {
    writeJson(SESSION_KEY, next)
    session.set(next)
  },

  /** Clears the credentials and tells subscribers why the session ended. */
  end(reason: SessionEndReason): void {
    const previous = session.get()
    if (!previous) return
    removeKey(SESSION_KEY)
    // Issue the visitor identity first, so no observer ever sees "nobody".
    ensureCartToken()
    session.set(null)
    endListeners.forEach((listener) => listener(reason, previous))
  },

  /** Ends the session only if `token` is still the active one (ignores late 401s). */
  expire(token: string | null): void {
    if (token && session.get()?.token === token) this.end('expired')
  },

  onEnd(listener: EndListener): () => void {
    endListeners.add(listener)
    return () => {
      endListeners.delete(listener)
    }
  },
}

/**
 * Cache scope of the private data on screen: `user:<id>` for a session,
 * `guest:<token>` for a visitor. It is part of every private query key, so data of
 * two identities can never share a cache entry.
 */
export function currentScope(): string {
  const userId = sessionStore.getUserId()
  return userId ? `user:${userId}` : `guest:${ensureCartToken()}`
}

/**
 * Keeps tabs consistent: signing out (or in as someone else) in one tab ends the
 * session of the others instead of leaving them with a dead token.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_TOKEN_KEY) {
      cartToken.set(readJson<string>(CART_TOKEN_KEY))
      return
    }
    if (event.key !== SESSION_KEY) return

    const previous = session.get()
    const next = readJson<StoredSession>(SESSION_KEY)
    if (previous?.token === next?.token) return

    cartToken.set(readJson<string>(CART_TOKEN_KEY))
    if (!next) ensureCartToken()
    session.set(next)
    if (previous) endListeners.forEach((listener) => listener('logout', previous))
  })
}
