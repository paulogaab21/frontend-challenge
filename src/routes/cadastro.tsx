import { createFileRoute } from '@tanstack/react-router'

import { AuthPage } from '@/features/auth/auth-page'
import { skipWhenAuthenticated, validateAuthSearch } from '@/features/auth/search'

export const Route = createFileRoute('/cadastro')({
  validateSearch: validateAuthSearch,
  beforeLoad: ({ search }) => skipWhenAuthenticated(search),
  component: RegisterRoute,
})

function RegisterRoute() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="register" redirectTo={redirect ?? '/'} />
}
