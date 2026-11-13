import { useId, useState } from 'react'

import { CheckIcon, CopyIcon, InfoIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import type { SimulatedTransaction } from '@/contracts'
import { formatEth } from '@/lib/money'

export interface TransactionDetailsProps {
  transaction: SimulatedTransaction
  orderTo: string
}

export function TransactionDetails({ transaction, orderTo }: TransactionDetailsProps) {
  const id = useId()
  const [copyStatus, setCopyStatus] = useState('')
  const networks = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
  return (
    <section
      aria-labelledby={id}
      className="mx-auto max-w-[780px] rounded-lg border border-line bg-surface p-5 md:p-8"
    >
      <h1 id={id} className="text-xl font-bold">
        Detalhes da transação
      </h1>
      <p className="mt-4 flex items-start gap-3 rounded-lg border border-copper/50 bg-band p-4 text-sm text-sand">
        <InfoIcon size={20} className="shrink-0 text-copper" />
        Explorador simulado — esta transação não existe em uma blockchain real.
      </p>
      <dl className="mt-6 divide-y divide-line text-sm">
        <div className="py-3">
          <dt className="font-bold text-sand">Hash da transação</dt>
          <dd className="mt-1 flex min-h-[60px] items-start gap-2 md:min-h-[35px]">
            <code className="min-w-0 flex-1 font-mono break-all">{transaction.hash}</code>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copiar hash da transação"
              onClick={async () => {
                try {
                  if (!navigator.clipboard) throw new Error('Clipboard unavailable')
                  await navigator.clipboard.writeText(transaction.hash)
                  setCopyStatus('Hash copiado.')
                } catch {
                  setCopyStatus('Não foi possível copiar o hash.')
                }
              }}
            >
              <CopyIcon size={18} />
            </Button>
          </dd>
        </div>
        <div className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3">
          <dt className="font-bold text-sand">Status</dt>
          <dd className="flex items-center gap-2">
            <CheckIcon size={18} className="text-amber" />
            Confirmada
          </dd>
        </div>
        <div className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3">
          <dt className="font-bold text-sand">Bloco</dt>
          <dd className="break-words">{transaction.block}</dd>
        </div>
        <div className="grid min-h-[65px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 md:min-h-[49px]">
          <dt className="font-bold text-sand">Data e hora</dt>
          <dd>
            <time dateTime={transaction.confirmedAt}>
              {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(transaction.confirmedAt),
              )}
            </time>
          </dd>
        </div>
        <div className="grid min-h-[65px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 md:min-h-[49px]">
          <dt className="font-bold text-sand">De</dt>
          <dd className="break-all">{transaction.from}</dd>
        </div>
        <div className="grid min-h-[65px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 md:min-h-[49px]">
          <dt className="font-bold text-sand">Para</dt>
          <dd className="break-all">{transaction.to}</dd>
        </div>
        <div className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3">
          <dt className="font-bold text-sand">Valor</dt>
          <dd className="break-words text-amber">{formatEth(transaction.value)}</dd>
        </div>
        <div className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3">
          <dt className="font-bold text-sand">Taxa de rede</dt>
          <dd className="break-words">{formatEth(transaction.fee)}</dd>
        </div>
        <div className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3">
          <dt className="font-bold text-sand">Rede</dt>
          <dd>{networks[transaction.network]}</dd>
        </div>
      </dl>
      <p role="status" className="min-h-5 text-xs text-sand">
        {copyStatus}
      </p>
      <Button variant="outline" asChild className="mt-4 max-w-full whitespace-normal">
        <SiteLink to={orderTo}>Ver pedido {transaction.orderId}</SiteLink>
      </Button>
    </section>
  )
}

export { TransactionDetailsSkeleton } from './transaction-details-skeleton'
