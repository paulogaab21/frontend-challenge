import { Skeleton } from '@/components/ui/skeleton'
export interface FeaturedBannerSkeletonProps {
  className?: string
}
export function FeaturedBannerSkeleton({ className }: FeaturedBannerSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando NFT em destaque" className={className}>
      <Skeleton className="h-[470px] w-full max-w-[310px] rounded-none" />
      <span className="sr-only">Carregando NFT em destaque</span>
    </div>
  )
}
