import { InfoIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'

export type TransactionDetailsSkeletonProps = Record<string, never>

export function TransactionDetailsSkeleton() {
  return (
    <section
      role="status"
      aria-label="Carregando transação"
      className="mx-auto max-w-[780px] rounded-lg border border-line bg-surface p-5 md:p-8"
    >
      <h2 className="text-xl font-bold">Detalhes da transação</h2>
      <p className="mt-4 flex items-start gap-3 rounded-lg border border-copper/50 bg-band p-4 text-sm text-sand">
        <InfoIcon size={20} className="shrink-0 text-copper" />
        Explorador simulado — esta transação não existe em uma blockchain real.
      </p>
      <div className="mt-6 divide-y divide-line text-sm">
        <div className="py-3">
          <p className="font-bold text-sand">Hash da transação</p>
          <Skeleton className="mt-1 h-[60px] w-full md:h-[35px]" />
        </div>
        {['Status', 'Bloco', 'Data e hora', 'De', 'Para', 'Valor', 'Taxa de rede', 'Rede'].map(
          (label) => (
            <div
              key={label}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 ${['Data e hora', 'De', 'Para'].includes(label) ? 'min-h-[65px] md:min-h-[49px]' : 'min-h-[49px]'}`}
            >
              <p className="font-bold text-sand">{label}</p>
              <Skeleton className="h-5 w-full" />
            </div>
          ),
        )}
      </div>
      <div className="h-5" />
      <Skeleton className="mt-4 h-10 w-60 max-w-full" />
    </section>
  )
}
