import type { ComponentProps } from 'react'
import { cn } from '@/components/ui/class-names'

export type TextareaProps = ComponentProps<'textarea'> & {
  sizeVariant?: 'default' | 'mobile' | 'responsive'
}

export function Textarea({
  className,
  rows = 1,
  sizeVariant = 'default',
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        'field-sizing-content min-h-10 w-full min-w-0 resize-y rounded-[5px] border border-line bg-transparent px-[15px] py-2 text-sm text-cream placeholder:text-khaki focus-visible:border-copper focus-visible:ring-2 focus-visible:ring-copper/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-coral aria-invalid:ring-coral/25',
        sizeVariant === 'mobile' && 'min-h-[50px] rounded-xl',
        sizeVariant === 'responsive' && 'min-h-[50px] rounded-xl md:min-h-10 md:rounded-[5px]',
        className,
      )}
      {...props}
    />
  )
}
