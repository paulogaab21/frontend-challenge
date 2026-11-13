import { createFileRoute } from '@tanstack/react-router'

import { TransactionPage } from '@/features/orders/transaction-page'

export const Route = createFileRoute('/_auth/transacao/$hash')({
  component: TransactionRoute,
})

function TransactionRoute() {
  const { hash } = Route.useParams()
  return <TransactionPage key={hash} hash={hash} />
}
