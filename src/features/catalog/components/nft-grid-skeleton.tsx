import { NftCardSkeleton } from './nft-card-skeleton'
export interface NftGridSkeletonProps {
  count?: number
}
export function NftGridSkeleton({ count = 9 }: NftGridSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando NFTs">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-[23px] pb-8 md:gap-x-[34px] md:gap-y-[71px] md:pb-0 xl:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="min-w-0 even:translate-y-8 md:even:translate-y-0">
            <NftCardSkeleton />
          </li>
        ))}
      </ul>
      <span className="sr-only">Carregando NFTs</span>
    </div>
  )
}
