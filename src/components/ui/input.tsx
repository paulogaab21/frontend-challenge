import type { ComponentProps } from 'react'
import { cn } from '@/components/ui/class-names'

export type InputProps = ComponentProps<'input'> & {
  sizeVariant?: 'default' | 'mobile' | 'responsive'
}
export function Input({ className, sizeVariant = 'default', type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={sizeVariant}
      className={cn(
        'h-10 w-full min-w-0 rounded-[5px] border border-line bg-transparent px-[15px] text-sm text-cream transition-colors file:mr-3 file:border-0 file:bg-band file:text-sand placeholder:text-khaki focus-visible:border-copper focus-visible:ring-2 focus-visible:ring-copper/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-coral aria-invalid:ring-coral/25',
        sizeVariant === 'mobile' && 'h-[50px] rounded-xl',
        sizeVariant === 'responsive' && 'h-[50px] rounded-xl md:h-10 md:rounded-[5px]',
        className,
      )}
      {...props}
    />
  )
}
