import { Skeleton } from '@/components/ui/skeleton'

export type TransactionDetailsSkeletonProps = Record<string, never>

export function TransactionDetailsSkeleton() {
  return (
    <section
      role="status"
      aria-label="Carregando transação"
      className="mx-auto max-w-[780px] rounded-lg border border-line bg-surface p-5 md:p-8"
    >
      <Skeleton className="h-7 w-64 max-w-full" />
      <Skeleton className="mt-4 h-[82px] w-full md:h-[82px]" />
      <div className="mt-6 divide-y divide-line">
        <div className="space-y-1 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[35px] w-full" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-[49px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3"
          >
            <Skeleton className="h-5 w-full" />
            <Skeleton
              className={index === 3 || index === 4 ? 'h-10 w-full md:h-5' : 'h-5 w-full'}
            />
          </div>
        ))}
      </div>
      <div className="h-5" />
      <Skeleton className="mt-4 h-10 w-60 max-w-full" />
    </section>
  )
}
