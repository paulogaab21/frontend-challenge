import { Skeleton } from '@/components/ui/skeleton'
import { NftGallerySkeleton } from './nft-gallery-skeleton'
import { NftPurchasePanelSkeleton } from './nft-purchase-panel-skeleton'
import { NftCarouselSkeleton } from './nft-carousel-skeleton'
export interface NftDetailSkeletonProps {
  className?: string
}
export function NftDetailSkeleton({ className }: NftDetailSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando NFT" className={className}>
      <Skeleton variant="line" className="mb-3 hidden w-40 md:block" />
      <div className="grid min-w-0 md:grid-cols-2 md:gap-8 xl:grid-cols-[572px_minmax(0,1fr)]">
        <NftGallerySkeleton />
        <NftPurchasePanelSkeleton />
      </div>
      <div aria-hidden="true" className="mt-24 space-y-4 px-6 md:px-0">
        <div className="flex min-h-[33px] gap-6 border-b border-hairline pb-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-6 w-4/5" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-24 px-6 md:px-0">
        <NftCarouselSkeleton />
      </div>
      <span className="sr-only">Carregando NFT</span>
    </div>
  )
}
