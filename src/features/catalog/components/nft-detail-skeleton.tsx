import { Skeleton } from '@/components/ui/skeleton'
import { NftGallerySkeleton } from './nft-gallery-skeleton'
import { NftPurchasePanelSkeleton } from './nft-purchase-panel-skeleton'
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
      <span className="sr-only">Carregando NFT</span>
    </div>
  )
}
