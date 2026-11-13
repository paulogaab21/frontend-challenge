import { useId } from 'react'

import { DangerTriangleIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import type { Order } from '@/contracts'

import { OrderItemsTable } from './order-items-table'
import { OrderPanel } from './order-panel'

export interface OrderDeclinedProps {
  order: Order
  closeTo: string
  retryTo: string
  cartTo: string
}

export function OrderDeclined({ order, closeTo, retryTo, cartTo }: OrderDeclinedProps) {
  const id = useId()
  return (
    <OrderPanel closeTo={closeTo} labelledBy={id}>
      <header className="space-y-4 px-6 pt-10 pb-6 text-center">
        <DangerTriangleIcon size={48} className="mx-auto text-coral" />
        <h1 id={id} className="text-xl font-bold">
          Pagamento recusado
        </h1>
        {order.statusMessage && <p className="text-sm text-sand">{order.statusMessage}</p>}
        <p className="text-sm text-sand">
          Nenhum valor foi debitado e seus itens continuam no carrinho.
        </p>
      </header>
      <div className="px-5 pb-8 md:px-11">
        <h2 className="mb-2 text-15 font-bold">Detalhes da transação</h2>
        <OrderItemsTable order={order} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="flex-1 whitespace-normal">
            <SiteLink to={retryTo}>Tentar novamente</SiteLink>
          </Button>
          <Button variant="outline" asChild className="flex-1 whitespace-normal">
            <SiteLink to={cartTo}>Voltar ao carrinho</SiteLink>
          </Button>
        </div>
      </div>
    </OrderPanel>
  )
}
