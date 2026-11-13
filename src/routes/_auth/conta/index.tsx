import { createFileRoute, redirect } from '@tanstack/react-router'

/** "/conta" has no page of its own: it opens the profile. */
export const Route = createFileRoute('/_auth/conta/')({
  beforeLoad: () => {
    throw redirect({ to: '/conta/perfil', replace: true })
  },
})
