import { Skeleton } from '@/components/ui/skeleton'
export interface CatalogFiltersSkeletonProps {
  categoryCount?: number
  networkCount?: number
  hasActiveFilters?: boolean
}
export function CatalogFiltersSkeleton({
  categoryCount = 9,
  networkCount = 3,
  hasActiveFilters = false,
}: CatalogFiltersSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Carregando filtros"
      className="w-full bg-surface p-5 lg:w-[310px]"
    >
      <Skeleton className="mb-2.5 h-[18px] w-24" />
      {Array.from({ length: categoryCount }, (_, index) => (
        <div key={index} className="flex h-10 items-center justify-between px-3">
          <Skeleton variant="line" className="w-32" />
          <Skeleton variant="line" className="w-8" />
        </div>
      ))}
      <div className="mt-10">
        <Skeleton className="mb-2.5 h-[18px] w-40" />
        <div className="pl-3">
          <Skeleton className="h-[18px] w-full" />
          <Skeleton className="mt-3 h-6 w-full" />
          <Skeleton className="mt-3 h-9 w-[92px]" />
        </div>
      </div>
      <div className="mt-10">
        <Skeleton className="mb-2.5 h-[18px] w-16" />
        {Array.from({ length: networkCount }, (_, index) => (
          <div key={index} className="flex h-10 items-center px-3">
            <Skeleton variant="line" className="w-full" />
          </div>
        ))}
      </div>
      {hasActiveFilters && <Skeleton className="mt-5 h-5 w-36" />}
      <span className="sr-only">Carregando filtros</span>
    </div>
  )
}
