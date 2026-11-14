import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
export interface NftCardSkeletonProps {
  variant?: 'default' | 'compact'
  className?: string
}
export function NftCardSkeleton({ variant = 'default', className }: NftCardSkeletonProps) {
  const compact = variant === 'compact'
  return (
    <div aria-hidden="true" className={cn('min-w-0', className)}>
      <Skeleton
        className={cn(
          'aspect-[175/200] w-full rounded-3xl md:aspect-auto md:h-[300px] md:rounded-none',
          compact && 'aspect-auto h-[255px] rounded-none md:h-[255px]',
        )}
      />
      <div
        className={cn(
          'mt-2 flex h-5 items-center px-2 md:mt-2.5 md:px-0',
          compact && 'mt-[13px] h-[18px] px-0 md:mt-[13px]',
        )}
      >
        <Skeleton variant="line" className="w-4/5" />
      </div>
      <div className={cn('flex h-6 items-center px-2 md:px-0', compact && 'h-5 px-0')}>
        <Skeleton variant="line" className="w-2/5" />
      </div>
    </div>
  )
}
