import type { ComponentProps } from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '@/components/ui/class-names'

export function Label({
  className,
  required,
  children,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-1.5 text-15 leading-6 font-normal text-cream peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-22 leading-none text-coral">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  )
}
