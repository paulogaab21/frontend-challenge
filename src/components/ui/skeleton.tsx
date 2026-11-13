import type { ComponentProps } from 'react'
import { cn } from '@/components/ui/class-names'

export function Skeleton({
  className,
  variant = 'block',
  ...props
}: ComponentProps<'div'> & { variant?: 'line' | 'block' | 'circle' }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'shimmer rounded-lg',
        variant === 'line' && 'h-4 rounded-sm',
        variant === 'circle' && 'aspect-square rounded-full',
        className,
      )}
      {...props}
    />
  )
}
