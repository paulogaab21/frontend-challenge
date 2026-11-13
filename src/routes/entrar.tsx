import { createFileRoute } from '@tanstack/react-router'

import { AuthPage } from '@/features/auth/auth-page'
import { skipWhenAuthenticated, validateAuthSearch } from '@/features/auth/search'

export const Route = createFileRoute('/entrar')({
  validateSearch: validateAuthSearch,
  beforeLoad: ({ search }) => skipWhenAuthenticated(search),
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect, motivo } = Route.useSearch()
  return <AuthPage mode="login" redirectTo={redirect ?? '/'} reason={motivo} />
}
