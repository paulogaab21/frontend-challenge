import { useId } from 'react'

import { CheckIcon, SpinnerIcon, WifiOffIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { Order } from '@/contracts'

import { OrderItemsTable } from './order-items-table'
import { OrderPanel } from './order-panel'

export interface OrderPendingProps {
  order: Order
  closeTo: string
  realtime: 'connected' | 'reconnecting'
  refreshing: boolean
  onRefresh: () => void
}

export function OrderPending({
  order,
  closeTo,
  realtime,
  refreshing,
  onRefresh,
}: OrderPendingProps) {
  const id = useId()
  return (
    <OrderPanel closeTo={closeTo} labelledBy={id}>
      <header className="px-6 pt-10 pb-6 text-center">
        <SpinnerIcon size={48} className="mx-auto text-copper motion-safe:animate-spin" />
        <h1 id={id} className="mt-4 text-lg font-bold text-sand">
          Aguardando a confirmação da sua carteira
        </h1>
        <p className="mt-2 text-sm break-words text-sand">Pedido {order.id}</p>
      </header>
      <div className="space-y-6 px-5 pb-8 md:px-11">
        <ol
          aria-label="Progresso do pedido"
          className="space-y-3 border-y border-copper py-4 text-sm text-sand"
        >
          <li className="flex items-center gap-2">
            <CheckIcon size={18} className="text-amber" />
            Pedido criado<span className="sr-only">: concluído</span>
          </li>
          <li aria-current="step" className="flex items-center gap-2 font-bold text-cream">
            <SpinnerIcon size={18} className="shrink-0 text-copper motion-safe:animate-spin" />
            Confirmação na carteira e na rede<span className="sr-only">: etapa atual</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-line-strong text-10"
            >
              3
            </span>
            NFTs na sua carteira<span className="sr-only">: próxima etapa</span>
          </li>
        </ol>
        <div>
          <h2 className="mb-2 text-15 font-bold">Detalhes da transação</h2>
          <OrderItemsTable order={order} />
        </div>
        <p className="text-sm text-sand">
          Não feche esta página: ela é atualizada automaticamente.
        </p>
        {realtime === 'reconnecting' && (
          <p className="flex items-start gap-2 rounded-lg border border-line-strong p-3 text-sm text-sand">
            <WifiOffIcon size={20} className="shrink-0 text-amber" />
            Conexão em tempo real interrompida. Tentando reconectar…
          </p>
        )}
        <Button loading={refreshing} onClick={onRefresh} className="w-full whitespace-normal">
          Atualizar status
        </Button>
      </div>
    </OrderPanel>
  )
}
