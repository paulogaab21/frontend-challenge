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

/**
 * Both keys are always present (`undefined` when absent or rejected) so the raw
 * query-string value can never reach the page — in particular a `redirect` that
 * points outside the app.
 */
export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  const target = safeRedirect(search.redirect)
  return {
    redirect: target === '/' ? undefined : target,
    motivo: search.motivo === 'sessao-expirada' ? 'sessao-expirada' : undefined,
  }
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
