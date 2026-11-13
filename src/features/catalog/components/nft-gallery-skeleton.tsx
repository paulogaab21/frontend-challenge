import { Skeleton } from '@/components/ui/skeleton'
export interface NftGallerySkeletonProps {
  viewCount?: number
}
export function NftGallerySkeleton({ viewCount = 4 }: NftGallerySkeletonProps) {
  return (
    <div aria-hidden="true" className="min-w-0">
      <Skeleton className="h-[calc(100vw+92px)] rounded-none md:hidden" />
      <div className="hidden grid-cols-[100px_minmax(0,1fr)] gap-7 md:grid">
        <div className="space-y-4">
          {Array.from({ length: viewCount }, (_, i) => (
            <Skeleton key={i} className="size-[100px]" />
          ))}
        </div>
        <Skeleton className="mt-0.5 aspect-square w-full self-start rounded-md" />
      </div>
    </div>
  )
}
