import { useId } from 'react'

import { AlertIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'

import { OrderPanel } from './order-panel'

export interface OrderUnavailableProps {
  kind: 'not-found' | 'forbidden' | 'error'
  closeTo: string
  onRetry?: () => void
}

export function OrderUnavailable({ kind, closeTo, onRetry }: OrderUnavailableProps) {
  const id = useId()
  const headings = {
    'not-found': 'Pedido não encontrado',
    forbidden: 'Este pedido pertence a outra conta',
    error: 'Não foi possível carregar o pedido',
  }
  return (
    <OrderPanel closeTo={closeTo} labelledBy={id}>
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <AlertIcon size={48} className="text-coral" />
        <h1 id={id} className="text-xl font-bold">
          {headings[kind]}
        </h1>
        {kind === 'error' && onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
        <Button variant="link" asChild className="whitespace-normal">
          <SiteLink to={closeTo}>Voltar ao início</SiteLink>
        </Button>
      </div>
    </OrderPanel>
  )
}
