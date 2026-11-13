import { Skeleton } from '@/components/ui/skeleton'
import { NftCardSkeleton } from './nft-card-skeleton'
export interface NftCarouselSkeletonProps {
  count?: number
}
export function NftCarouselSkeleton({ count = 5 }: NftCarouselSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando coleção">
      <div className="flex h-[37px] items-start border-b-[0.3px] border-copper">
        <Skeleton variant="line" className="w-48" />
      </div>
      <div className="mt-8 flex gap-[26px] overflow-hidden pb-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="w-[219px] shrink-0">
            <NftCardSkeleton variant="compact" />
          </div>
        ))}
      </div>
      <Skeleton variant="line" className="mx-auto mt-6 h-4 w-12" />
      <span className="sr-only">Carregando coleção</span>
    </div>
  )
}
