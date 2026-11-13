import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'

import { bindSessionLifecycle } from '@/features/auth/session-lifecycle'
import { startRealtimeSync } from '@/features/realtime/sync'
import { env } from '@/lib/env'
import { whenTransportReady } from '@/lib/http'
import { notify } from '@/lib/notify'
import { sessionStore } from '@/lib/session-store'

/** Routes under the `_auth` layout require a session. */
const PRIVATE_ROUTE_PREFIX = '/_auth'

/**
 * Reacts to the end of a session:
 * - private cache and checkout context are cleaned up (see session-lifecycle);
 * - the collector is told what happened;
 * - if the screen in front of them is private, they are taken to the sign-in page
 *   (expiry — keeping the way back) or to the home page (sign out).
 * A timer also ends the session locally at the instant the API said it expires.
 */
function SessionEffects() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get)

  useEffect(() => bindSessionLifecycle(queryClient), [queryClient])

  useEffect(
    () =>
      sessionStore.onEnd((reason) => {
        const { location, matches } = router.state
        const onPrivateRoute = matches.some((match) =>
          match.routeId.startsWith(PRIVATE_ROUTE_PREFIX),
        )
        if (reason === 'expired') {
          notify.warning('Sua sessão expirou. Entre novamente para continuar.', { id: 'session' })
          if (onPrivateRoute) {
            void router.navigate({
              to: '/entrar',
              search: { redirect: location.href, motivo: 'sessao-expirada' },
              replace: true,
            })
          }
        } else {
          notify.info('Você saiu da sua conta.', { id: 'session' })
          if (onPrivateRoute) void router.navigate({ to: '/', replace: true })
        }
      }),
    [router],
  )

  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    // setTimeout overflows above 2^31-1 ms; such a session outlives the tab anyway.
    if (remaining > 2_147_000_000) return
    const timer = setTimeout(() => sessionStore.expire(session.token), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [session])

  return null
}

/** Opens the Socket.IO connection and binds it to the query cache. */
function RealtimeEffects() {
  const queryClient = useQueryClient()
  useEffect(() => startRealtimeSync(queryClient), [queryClient])
  return null
}

const MockDevtools = lazy(() =>
  import('@/mocks/devtools').then((module) => ({ default: module.MockDevtools })),
)

/** Operator panel of the simulated backend — only part of builds with mocks enabled. */
function MockDevtoolsMount() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    void whenTransportReady().then(
      () => active && setReady(true),
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [])
  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <MockDevtools />
    </Suspense>
  )
}

/** Behaviours that live for the whole life of the app, mounted once at the root. */
export function AppEffects() {
  return (
    <>
      <SessionEffects />
      <RealtimeEffects />
      {env.enableMocks && <MockDevtoolsMount />}
    </>
  )
}
