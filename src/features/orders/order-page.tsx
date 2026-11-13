import { isApiError } from '@/lib/http'
import { useDocumentTitle } from '@/lib/use-document-title'

import { OrderDeclined } from './components/order-declined'
import { OrderPending } from './components/order-pending'
import { OrderReceipt } from './components/order-receipt'
import { OrderSkeleton } from './components/order-skeleton'
import { OrderUnavailable } from './components/order-unavailable'
import { useOrder, useRealtimeStatus } from './queries'

const TITLES = {
  pending: 'Aguardando confirmação',
  confirmed: 'Pedido confirmado',
  declined: 'Pagamento recusado',
} as const

export interface OrderPageProps {
  orderId: string
}

/**
 * One order, in whatever state the simulation reports it:
 * pending → confirmed | declined (both terminal).
 *
 * The receipt is rendered only for an order the API says is `confirmed`; a
 * pending order shows its progress and moves on by itself when `order.updated`
 * arrives (or, with the socket down, when the REST fallback sees the change).
 * Reloading the page — or coming back later — lands in the same place: the state
 * lives on the server, the page only reads it.
 */
export function OrderPage({ orderId }: OrderPageProps) {
  const order = useOrder(orderId)
  const realtime = useRealtimeStatus()
  useDocumentTitle(order.data ? TITLES[order.data.status] : 'Pedido')

  const closeTo = '/'

  return (
    <main id="conteudo" className="min-h-dvh pb-16">
      {order.data ? (
        order.data.status === 'confirmed' ? (
          <OrderReceipt
            order={order.data}
            closeTo={closeTo}
            explorerTo={order.data.transaction?.explorerUrl ?? `/pedido/${orderId}`}
          />
        ) : order.data.status === 'declined' ? (
          <OrderDeclined
            order={order.data}
            closeTo={closeTo}
            retryTo="/pagamento"
            cartTo="/carrinho"
          />
        ) : (
          <OrderPending
            order={order.data}
            closeTo={closeTo}
            realtime={realtime}
            refreshing={order.isFetching}
            onRefresh={() => void order.refetch()}
          />
        )
      ) : order.isError ? (
        <OrderUnavailable
          kind={
            isApiError(order.error, 'NOT_FOUND')
              ? 'not-found'
              : isApiError(order.error, 'FORBIDDEN')
                ? 'forbidden'
                : 'error'
          }
          closeTo={closeTo}
          onRetry={() => void order.refetch()}
        />
      ) : (
        <OrderSkeleton closeTo={closeTo} />
      )}
    </main>
  )
}
