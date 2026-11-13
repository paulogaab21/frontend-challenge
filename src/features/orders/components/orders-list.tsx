import { CheckIcon, DangerTriangleIcon, SpinnerIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import type { Order } from '@/contracts'
import { formatEth } from '@/lib/money'

import { formatOrderDate } from './format-order-date'

export interface OrdersListProps {
  orders: Order[]
  getHref: (order: Order) => string
  exploreTo: string
}

export function OrdersList({ orders, getHref, exploreTo }: OrdersListProps) {
  if (!orders.length)
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-lg bg-surface p-6 text-center">
        <p className="text-sand">Você ainda não fez nenhum pedido.</p>
        <Button asChild>
          <SiteLink to={exploreTo}>Explorar NFTs</SiteLink>
        </Button>
      </div>
    )
  return (
    <ul aria-label="Pedidos do colecionador" className="space-y-3">
      {orders.map((order) => {
        const Icon =
          order.status === 'confirmed'
            ? CheckIcon
            : order.status === 'declined'
              ? DangerTriangleIcon
              : SpinnerIcon
        const label =
          order.status === 'confirmed'
            ? 'Confirmado'
            : order.status === 'declined'
              ? 'Recusado'
              : 'Aguardando confirmação'
        return (
          <li key={order.id}>
            <SiteLink
              to={getHref(order)}
              className="grid min-h-[124px] gap-3 rounded-lg border border-line bg-surface p-5 hover:border-copper md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <h3 className="text-base font-bold break-words">Pedido {order.id}</h3>
                <p className="mt-2 text-sm leading-5 text-sand">
                  <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time> ·{' '}
                  {order.items.reduce((count, item) => count + item.quantity, 0)} itens
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                <p className="text-lg font-bold text-amber">{formatEth(order.total)}</p>
                <span className="inline-flex items-center gap-2 text-xs text-sand">
                  <Icon size={16} />
                  {label}
                </span>
              </div>
            </SiteLink>
          </li>
        )
      })}
    </ul>
  )
}

export { OrdersListSkeleton } from './orders-list-skeleton'
