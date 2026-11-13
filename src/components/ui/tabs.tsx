import type { ComponentProps } from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/ui/class-names'

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex min-w-0 flex-col gap-6', className)}
      {...props}
    />
  )
}
export const tabsListVariants = cva(
  'inline-flex w-fit max-w-full flex-wrap items-center gap-x-6 gap-y-2 bg-transparent',
  {
    variants: { variant: { default: '', line: '' } },
    defaultVariants: { variant: 'line' },
  },
)
export function TabsList({
  className,
  variant,
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // `max-w-full`: a label longer than the row wraps inside its tab instead of
        // pushing the page sideways on narrow screens.
        'relative inline-flex min-h-8 max-w-full shrink-0 items-center justify-center gap-2 border-b-2 border-transparent pb-1 text-left text-15 font-medium text-cream transition-colors hover:text-amber disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:border-copper data-[state=active]:text-amber',
        className,
      )}
      {...props}
    />
  )
}
export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('min-w-0 flex-1', className)}
      {...props}
    />
  )
}
