import { useId, type ReactNode } from 'react'
import { SiteLink as Link } from '@/components/layout/site-link'
import { BackIcon, FilterIcon, MobileSearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/components/ui/class-names'

type HomeTopBarProps = {
  variant: 'home'
  query?: string
  onSearchChange?: (query: string) => void
  onSearchSubmit?: (query: string) => void
  onFilter?: () => void
  searchLabel?: string
}
type InnerTopBarProps = {
  variant: 'inner'
  title: string
  backTo?: string
  onBack?: () => void
  rightAction?: ReactNode
}
export type MobileTopBarProps = (HomeTopBarProps | InnerTopBarProps) & { className?: string }

export function MobileTopBar(props: MobileTopBarProps) {
  const id = useId()
  if (props.variant === 'home')
    return (
      <header className={cn('flex gap-2 px-6 pt-10 pb-4', props.className)}>
        <form
          className="relative min-w-0 flex-1"
          role="search"
          aria-label={props.searchLabel ?? 'Buscar coleções'}
          onSubmit={(event) => {
            event.preventDefault()
            const query = new FormData(event.currentTarget).get('query')
            if (typeof query === 'string') props.onSearchSubmit?.(query)
          }}
        >
          <label htmlFor={id} className="sr-only">
            Explorar coleções
          </label>
          <MobileSearchIcon className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-khaki" />
          <Input
            id={id}
            name="query"
            type="search"
            placeholder="Explorar coleções"
            value={props.query}
            onChange={(event) => props.onSearchChange?.(event.target.value)}
            className="h-[45px] rounded-xl border-0 bg-surface pr-3 pl-[42px] font-bold"
          />
        </form>
        <Button
          variant="gradient"
          size="icon"
          className="size-[45px] rounded-[14px] bg-linear-135 from-copper/45 to-copper"
          onClick={props.onFilter}
          aria-label="Abrir filtros"
        >
          <FilterIcon />
        </Button>
      </header>
    )
  return (
    <header
      className={cn(
        'grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 px-7 pt-8 pb-5',
        props.className,
      )}
    >
      {props.onBack ? (
        <Button
          variant="icon"
          size="icon"
          className="size-9 rounded-full text-khaki"
          onClick={props.onBack}
          aria-label="Voltar"
        >
          <BackIcon />
        </Button>
      ) : (
        <Button variant="icon" size="icon" className="size-9 rounded-full text-khaki" asChild>
          <Link to={props.backTo ?? '/'} aria-label="Voltar">
            <BackIcon />
          </Link>
        </Button>
      )}
      {/* The mobile frames centre inner titles 12px right of the screen centre. */}
      <p className="min-w-0 translate-x-3 text-center text-xl leading-7 font-bold max-[400px]:translate-x-1 max-[400px]:text-lg">
        {props.title}
      </p>
      <div className="flex size-9 items-center justify-center">{props.rightAction}</div>
    </header>
  )
}
