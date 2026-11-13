import { Skeleton } from '@/components/ui/skeleton'
export interface HeroCarouselSkeletonProps {
  className?: string
}
export function HeroCarouselSkeleton({ className }: HeroCarouselSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando destaques" className={className}>
      <Skeleton className="h-[190px] rounded-[30px] md:h-[450px] md:rounded-4xl" />
      <span className="sr-only">Carregando destaques</span>
    </div>
  )
}
