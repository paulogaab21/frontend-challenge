import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import type { LoginRequest, RegisterRequest, Session, User } from '@/contracts'
import { queryKeys } from '@/lib/query-keys'
import { cartTokenStore, currentScope, sessionStore, type StoredSession } from '@/lib/session-store'

import * as api from './api'

/**
 * Session model
 * - The credentials (opaque token, user id, expiry) live in `sessionStore`,
 *   persisted in localStorage so a refresh keeps the collector signed in.
 * - The user object is server state: fetched with GET /session on boot and kept in
 *   the query cache under the private scope of that user.
 * - A visitor always has a cart token, so the cart works before signing in.
 */

function subscribeIdentity(listener: () => void): () => void {
  const offSession = sessionStore.subscribe(listener)
  const offCart = cartTokenStore.subscribe(listener)
  return () => {
    offSession()
    offCart()
  }
}

/** `user:<id>` or `guest:<cart token>` — the owner of the private cache on screen. */
export function useScope(): string {
  return useSyncExternalStore(subscribeIdentity, currentScope)
}

export function useStoredSession(): StoredSession | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
}

export function sessionQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.session(scope),
    queryFn: ({ signal }) => api.fetchSession(signal),
    staleTime: 5 * 60_000,
  })
}

export interface SessionState {
  /** True as soon as credentials exist, even before the user object arrives. */
  isAuthenticated: boolean
  /** The collector is signed in but the user object is still loading. */
  isLoading: boolean
  user: User | null
  scope: string
}

export function useSession(): SessionState {
  const stored = useStoredSession()
  const scope = useScope()
  const query = useQuery({ ...sessionQueryOptions(scope), enabled: stored !== null })
  return {
    isAuthenticated: stored !== null,
    isLoading: stored !== null && query.isPending,
    user: stored ? (query.data?.user ?? null) : null,
    scope,
  }
}

/** True while `scope` is still the identity on screen (guards late async writes). */
export function isCurrentScope(scope: string): boolean {
  return currentScope() === scope
}

/**
 * Starts a session from the API answer of sign in / sign up.
 * Whatever the previous identity was (a visitor or another user), its private
 * cache is dropped first — the new session starts from a clean slate.
 */
export function establishSession(queryClient: QueryClient, session: Session): void {
  void queryClient.cancelQueries({ queryKey: queryKeys.private.all })
  queryClient.removeQueries({ queryKey: queryKeys.private.all })
  sessionStore.start({
    token: session.token,
    userId: session.user.id,
    expiresAt: session.expiresAt,
  })
  // The API merged the visitor's cart into the account; the visitor token is spent.
  cartTokenStore.clear()
  queryClient.setQueryData(queryKeys.private.session(`user:${session.user.id}`), session)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginRequest) => api.login(input),
    onSuccess: (session) => establishSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterRequest) => api.register(input),
    onSuccess: (session) => establishSession(queryClient, session),
  })
}

export function useLogout() {
  return useMutation({
    // The local session ends whether or not the API could be reached: signing out
    // must always work, and a token the client forgot is useless to it.
    mutationFn: () => api.logout().catch(() => undefined),
    onSettled: () => sessionStore.end('logout'),
  })
}
