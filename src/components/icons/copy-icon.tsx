import { Copy } from 'lucide-react'
import type { IconProps } from './icon-base'

export function CopyIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <Copy
      size={size}
      strokeWidth={1.5}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...props}
    />
  )
}
