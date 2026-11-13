import { createFileRoute } from '@tanstack/react-router'

import { WalletsPage } from '@/features/account/wallets-page'

export const Route = createFileRoute('/_auth/conta/carteiras')({
  component: WalletsPage,
})
