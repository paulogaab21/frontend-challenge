import { Skeleton } from '@/components/ui/skeleton'

export interface CartItemsSkeletonProps {
  rows?: number
}

export function CartItemsSkeleton({ rows = 3 }: CartItemsSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando NFTs do carrinho" className="min-w-0">
      <div
        aria-hidden="true"
        className="hidden h-[30px] grid-cols-[39.8%_17.7%_17.45%_16.05%_9%] border-b border-copper/30 md:grid"
      >
        {['NFTs', 'Preço', 'Edições', 'Total'].map((label) => (
          <span key={label} className="text-base leading-5">
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-5 md:mt-3 md:space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="min-w-0">
            <div className="flex h-[100px] items-center gap-[9px] rounded-[14px] bg-surface md:h-[70px] md:gap-4 md:rounded-none">
              <Skeleton className="size-[100px] shrink-0 rounded-[14px] md:size-[70px] md:rounded-md" />
              <div className="min-w-0 flex-1 space-y-2 pr-3">
                <Skeleton className="h-5 w-4/5 max-w-[175px]" />
                <Skeleton className="h-5 w-3/5 max-w-[145px]" />
                <Skeleton className="h-[22px] w-24 md:hidden" />
              </div>
              <Skeleton className="hidden h-5 w-[17%] md:block" />
              <Skeleton className="mr-3 hidden h-10 w-[17%] md:block" />
              <Skeleton className="mr-10 hidden h-5 w-[16%] md:block" />
            </div>
            <div className="mt-2 h-8 md:hidden" />
          </div>
        ))}
      </div>
    </div>
  )
}
