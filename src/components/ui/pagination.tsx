import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { MoreHorizontal } from 'lucide-react'
import { ArrowLeft2Icon, ArrowRight2Icon } from '@/components/icons'
import { cn } from '@/components/ui/class-names'

export function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="Paginação"
      data-slot="pagination"
      className={cn('flex w-full justify-center', className)}
      {...props}
    />
  )
}
export function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  )
}
export function PaginationItem(props: ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}
export type PaginationLinkProps = ComponentProps<'a'> & { isActive?: boolean; asChild?: boolean }
export function PaginationLink({
  className,
  isActive,
  asChild = false,
  'aria-disabled': ariaDisabled,
  onClickCapture,
  tabIndex,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="pagination-link"
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={ariaDisabled}
      tabIndex={ariaDisabled === true || ariaDisabled === 'true' ? -1 : tabIndex}
      onClickCapture={(event) => {
        if (ariaDisabled === true || ariaDisabled === 'true') {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onClickCapture?.(event)
      }}
      className={cn(
        'flex size-[35px] items-center justify-center rounded-sm border border-line text-lg leading-none text-cream transition-colors hover:border-copper aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        isActive && 'border-copper bg-copper font-bold text-ink',
        className,
      )}
      {...props}
    />
  )
}
export function PaginationPrevious({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Página anterior" className={className} {...props}>
      <ArrowLeft2Icon />
    </PaginationLink>
  )
}
export function PaginationNext({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Próxima página" className={className} {...props}>
      <ArrowRight2Icon />
    </PaginationLink>
  )
}
export function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn('flex size-[35px] items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">Mais páginas</span>
    </span>
  )
}
