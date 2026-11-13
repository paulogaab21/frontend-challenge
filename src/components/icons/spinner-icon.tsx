import { LoaderCircle } from 'lucide-react'
import type { IconProps } from './icon-base'

export function SpinnerIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={1.5}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...props}
    />
  )
}
