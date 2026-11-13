import { Skeleton } from '@/components/ui/skeleton'
export interface WalletsListSkeletonProps {
  form?: boolean
  count?: number
}
export function WalletsListSkeleton({ form = false, count = 2 }: WalletsListSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando carteiras">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-1.5 h-8 w-full md:h-4" />
      {form ? (
        <>
          <div className="mt-8 grid gap-x-7 gap-y-6 md:grid-cols-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-8 h-10 w-[131px]" />
          <Skeleton className="mt-8 h-[92px] w-full md:h-11" />
        </>
      ) : (
        <div className="mt-8 space-y-8">
          {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} className="h-[310px] w-full sm:h-[190px]" />
          ))}
        </div>
      )}
      <span className="sr-only">Carregando carteiras</span>
    </div>
  )
}
