import { RefreshCw } from 'lucide-react'
import type { IconProps } from './icon-base'

export function RefreshIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <RefreshCw
      size={size}
      strokeWidth={1.5}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...props}
    />
  )
}
