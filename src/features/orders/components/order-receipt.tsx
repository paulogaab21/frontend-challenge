import { useId } from 'react'

import { ThankYouIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { shortenAddress, type Order } from '@/contracts'
import { formatEth } from '@/lib/money'

import { formatOrderDate } from './format-order-date'
import { OrderItemsTable } from './order-items-table'
import { OrderPanel } from './order-panel'

export interface OrderReceiptProps {
  order: Order
  closeTo: string
  explorerTo: string
}

export function OrderReceipt({ order, closeTo, explorerTo }: OrderReceiptProps) {
  const id = useId()
  const networks = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
  return (
    <OrderPanel closeTo={closeTo} labelledBy={id}>
      <header className="px-6 pt-[22px] pb-[14px] text-center">
        <ThankYouIcon size={80} className="mx-auto text-copper" />
        <h1 id={id} className="mt-4 text-base leading-6 font-bold text-sand">
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>
      <dl className="grid grid-cols-2 gap-y-4 border-y border-copper px-6 py-[17px] text-sm leading-[19px] text-sand md:grid-cols-[1.25fr_1.1fr_1fr_0.8fr] md:px-9">
        <div className="min-w-0 border-r border-copper pr-3">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-15" title={order.transaction?.hash}>
            <span aria-hidden="true">
              {order.transaction ? shortenAddress(order.transaction.hash) : '—'}
            </span>
            <span className="sr-only">{order.transaction?.hash ?? 'Não informada'}</span>
          </dd>
        </div>
        <div className="min-w-0 pl-4 md:border-r md:border-copper md:px-4">
          <dt>Data</dt>
          <dd className="text-15">
            <time dateTime={order.settledAt ?? undefined}>{formatOrderDate(order.settledAt)}</time>
          </dd>
        </div>
        <div className="min-w-0 border-r border-copper pr-3 md:px-4">
          <dt>Total</dt>
          <dd className="text-15 break-words">{formatEth(order.total)}</dd>
        </div>
        <div className="min-w-0 pl-4">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-15 break-words">{order.wallet.label}</dd>
        </div>
      </dl>
      <div className="px-5 pt-5 md:px-11">
        <h2 className="mb-2 text-15 leading-5 font-bold">Detalhes da transação</h2>
        <OrderItemsTable order={order} />
        <div className="mt-3 border-t border-copper/30 pt-3 pb-[17px] text-center">
          <p className="text-sm leading-[22px] text-sand">
            Transação confirmada na {networks[order.network]}. A propriedade foi transferida para
            sua carteira conectada e registrada na rede.
          </p>
          {order.transaction && (
            <Button asChild className="mt-5 h-12 max-w-full rounded-[5px] px-4 whitespace-normal">
              <SiteLink to={explorerTo}>Ver no {order.transaction.explorerName}</SiteLink>
            </Button>
          )}
          <p className="mt-3 text-10 leading-4 text-sand">
            Transação e explorador simulados para demonstração.
          </p>
        </div>
      </div>
    </OrderPanel>
  )
}
