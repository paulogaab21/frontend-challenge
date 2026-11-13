import { StarIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
export interface RatingStarsProps {
  value: number
  className?: string
}
export function RatingStars({ value, className }: RatingStarsProps) {
  return (
    <span
      role="img"
      aria-label={`${value.toLocaleString('pt-BR')} de 5`}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          size={15}
          className={index < Math.round(value) ? 'text-copper' : 'text-sand'}
        />
      ))}
    </span>
  )
}
