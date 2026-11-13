import { createFileRoute } from '@tanstack/react-router'

import { ActivityPage } from '@/features/account/activity-page'

export const Route = createFileRoute('/_auth/conta/atividade')({
  component: ActivityPage,
})
