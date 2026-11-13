import { TriangleAlert } from 'lucide-react'
import type { IconProps } from './icon-base'

export function AlertIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <TriangleAlert
      size={size}
      strokeWidth={1.5}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...props}
    />
  )
}
