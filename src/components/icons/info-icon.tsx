import { Info } from 'lucide-react'
import type { IconProps } from './icon-base'

export function InfoIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <Info
      size={size}
      strokeWidth={1.5}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...props}
    />
  )
}
