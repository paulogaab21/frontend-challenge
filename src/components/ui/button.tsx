import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { Slot } from 'radix-ui'
import { cn } from '@/components/ui/class-names'

const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-mono font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-copper text-base text-ink hover:bg-amber active:bg-copper/85',
        primary: 'bg-copper text-base text-ink hover:bg-amber active:bg-copper/85',
        outline:
          'border border-copper bg-transparent text-base text-amber hover:bg-copper/10 active:bg-copper/20',
        ghost: 'bg-transparent text-base text-cream hover:bg-surface-raised active:bg-band',
        link: 'h-auto bg-transparent p-0 text-base font-normal text-amber underline-offset-4 hover:underline',
        icon: 'border border-line bg-surface-raised text-base text-cream hover:border-copper hover:text-amber',
        social:
          'border border-line bg-transparent text-13 font-medium text-sand hover:bg-surface-raised',
        gradient:
          'rounded-[30px] bg-copper-gradient text-base text-ink hover:brightness-110 active:brightness-95',
        secondary: 'bg-band text-base text-cream hover:bg-line-strong',
        destructive: 'bg-coral text-base text-ink hover:bg-coral/85',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 px-3',
        header: 'h-[35px] w-[100px] px-2 font-medium',
        lg: 'h-[45px] px-6',
        mobile: 'h-[60px] rounded-xl px-6',
        pill: 'h-[60px] rounded-[30px] px-6',
        icon: 'size-[35px] p-0',
        'icon-sm': 'size-6 rounded-full p-0',
        'icon-lg': 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }

function Button({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  loading = false,
  children,
  disabled,
  onClick,
  onClickCapture,
  type,
  ...props
}: ButtonProps) {
  const blocked = disabled || loading
  const slotted =
    asChild && React.isValidElement<{ children?: React.ReactNode }>(children) ? children : null
  const content = loading ? (
    <>
      <span className="inline-flex items-center justify-center gap-2 opacity-0">
        {slotted ? slotted.props.children : children}
      </span>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <LoaderCircle size={18} strokeWidth={1.5} className="motion-safe:animate-spin" />
      </span>
      <span className="sr-only" role="status">
        Carregando
      </span>
    </>
  ) : (
    children
  )
  const child = slotted
    ? React.cloneElement(slotted, {}, loading ? content : slotted.props.children)
    : content
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size: variant === 'link' ? null : size }), className)}
      type={asChild ? undefined : (type ?? 'button')}
      disabled={asChild ? undefined : blocked}
      aria-disabled={blocked || undefined}
      aria-busy={loading || undefined}
      onClickCapture={(event) => {
        if (blocked) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onClickCapture?.(event)
      }}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...props}
    >
      {child}
    </Comp>
  )
}
export { Button, buttonVariants }
