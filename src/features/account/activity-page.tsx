import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { type Order } from '@/contracts'
import { OrdersList } from '@/features/orders/components/orders-list'
import { OrdersListSkeleton } from '@/features/orders/components/orders-list-skeleton'
import { useOrders } from '@/features/orders/queries'
import { errorMessage } from '@/lib/http'

import { AccountShell } from './account-shell'

const orderHref = (order: Order) => `/pedido/${order.id}`

/**
 * "Atividade": the collector's orders. It is how a pending purchase is found again
 * after closing the tab, and where past receipts live.
 */
export function ActivityPage() {
  const orders = useOrders()

  return (
    <AccountShell section="atividade" title="Atividade">
      <h1 className="text-17 leading-6 font-bold">Atividade</h1>
      <p className="mt-1.5 text-sm text-sand">Seus pedidos, do mais recente ao mais antigo.</p>
      <div className="mt-6">
        {orders.data ? (
          <OrdersList orders={orders.data.items} getHref={orderHref} exploreTo="/#mercado" />
        ) : orders.isError ? (
          <div
            role="alert"
            className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center"
          >
            <AlertIcon size={32} className="text-coral" />
            <h2 className="text-xl font-bold">Não foi possível carregar seus pedidos</h2>
            <p className="max-w-md text-sand">{errorMessage(orders.error)}</p>
            <Button onClick={() => void orders.refetch()} loading={orders.isFetching}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <OrdersListSkeleton />
        )}
      </div>
    </AccountShell>
  )
}
