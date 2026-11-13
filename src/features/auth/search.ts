import { redirect } from '@tanstack/react-router'

import { safeRedirect, splitHref } from '@/lib/search-params'
import { hasLiveSession } from '@/lib/session-store'

/**
 * URL state of the sign-in and sign-up pages:
 *   /entrar?redirect=%2Fpagamento&motivo=sessao-expirada
 */
export interface AuthSearch {
  /** In-app path to return to after authenticating. */
  redirect?: string
  /** Set when the collector was sent here because the session expired. */
  motivo?: 'sessao-expirada'
}

export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  const result: AuthSearch = {}
  const target = safeRedirect(search.redirect)
  if (target !== '/') result.redirect = target
  if (search.motivo === 'sessao-expirada') result.motivo = 'sessao-expirada'
  return result
}

/** Someone already signed in has nothing to do on these pages: move them along. */
export function skipWhenAuthenticated(search: AuthSearch): void {
  if (!hasLiveSession()) return
  const { to, search: targetSearch, hash } = splitHref(search.redirect ?? '/')
  throw redirect({ to, search: targetSearch, hash, replace: true })
}

/** Guard of the private routes: without a live session, go sign in and come back. */
export function requireSession(href: string): void {
  if (hasLiveSession()) return
  throw redirect({ to: '/entrar', search: { redirect: href }, replace: true })
}
