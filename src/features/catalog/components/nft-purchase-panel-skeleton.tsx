import { Skeleton } from '@/components/ui/skeleton'
export interface NftPurchasePanelSkeletonProps {
  className?: string
}
export function NftPurchasePanelSkeleton({ className }: NftPurchasePanelSkeletonProps) {
  return (
    <div aria-hidden="true" className={className}>
      <div className="relative z-10 -mt-[114px] min-h-[476px] rounded-t-[30px] bg-surface px-6 pt-8 pb-[200px] md:mt-0 md:h-[574px] md:min-h-0 md:overflow-hidden md:bg-transparent md:p-0 xl:h-[451px]">
        <Skeleton className="h-7 w-4/5 md:h-9" />
        <Skeleton className="mt-3 hidden h-9 w-full md:block" />
        <Skeleton className="mt-4 h-[68px] w-full md:h-[108px]" />
        <Skeleton className="mt-3 h-[60px] w-4/5" />
        <Skeleton className="mt-3 hidden h-[67px] w-full md:block" />
        <Skeleton className="mt-3 h-[84px] w-4/5" />
        <Skeleton className="mt-3 hidden h-6 w-1/2 md:block" />
      </div>
      <Skeleton className="fixed inset-x-0 bottom-0 z-30 h-[164px] rounded-t-[30px] md:hidden" />
    </div>
  )
}
