import { Skeleton } from '@/components/ui/skeleton'

export interface OrdersListSkeletonProps {
  rows?: number
}

export function OrdersListSkeleton({ rows = 3 }: OrdersListSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando pedidos" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid min-h-[124px] gap-3 rounded-lg border border-line bg-surface p-5 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}
