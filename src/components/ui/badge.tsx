import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/components/ui/class-names'

const badgeVariants = cva('inline-flex w-fit shrink-0 items-center justify-center font-medium', {
  variants: {
    variant: {
      default: 'rounded-sm bg-copper px-2 py-1 text-xs text-ink',
      count: 'size-[18px] rounded-full bg-copper p-0 text-10 leading-none text-ink ring-2 ring-ink',
      rare: 'min-h-[29px] rounded-none bg-copper px-[15px] text-sm text-ink',
      outline: 'rounded-md border border-line-strong bg-band px-2 py-1 text-2xs text-amber',
      secondary: 'rounded-sm bg-band px-2 py-1 text-xs text-sand',
      destructive: 'rounded-sm bg-coral px-2 py-1 text-xs text-ink',
    },
  },
  defaultVariants: { variant: 'default' },
})
export function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
export { badgeVariants }
