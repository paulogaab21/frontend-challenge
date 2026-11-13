import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireSession } from '@/features/auth/search'

/**
 * Layout of the private area: checkout, orders and account. Every child route
 * inherits the guard, on direct access and refresh included.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => requireSession(location.href),
  component: Outlet,
})
