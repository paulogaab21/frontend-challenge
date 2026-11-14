import type { NftSort, NftTab } from '@/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useId } from 'react'
import { cn } from '@/lib/utils'
export interface CatalogToolbarProps {
  tab: NftTab
  onTabChange: (tab: NftTab) => void
  sort: NftSort
  onSortChange: (sort: NftSort) => void
  resultSummary?: string
  disabled?: boolean
}
const tabs: { id: NftTab; label: string }[] = [
  { id: 'todos', label: 'Todos os NFTs' },
  { id: 'novos', label: 'Novos lançamentos' },
  { id: 'em-alta', label: 'Em alta' },
]
const sorts: { id: NftSort; label: string }[] = [
  { id: 'recentes', label: 'Listados recentemente' },
  { id: 'preco-asc', label: 'Menor preço' },
  { id: 'preco-desc', label: 'Maior preço' },
  { id: 'nome-asc', label: 'Nome A–Z' },
  { id: 'nome-desc', label: 'Nome Z–A' },
]
export function CatalogToolbar({
  tab,
  onTabChange,
  sort,
  onSortChange,
  resultSummary,
  disabled,
}: CatalogToolbarProps) {
  const id = useId()
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-nowrap items-start justify-between gap-x-0 gap-y-3 md:flex-wrap md:gap-x-5">
        <div
          role="tablist"
          tabIndex={-1}
          aria-label="Categorias de NFTs"
          className="flex max-w-full min-w-0 flex-1 gap-1 overflow-x-auto whitespace-nowrap md:flex-none md:gap-6"
          onKeyDown={(event) => {
            const index = tabs.findIndex((item) => item.id === tab)
            const next =
              event.key === 'ArrowRight'
                ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft'
                  ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : -1
            const item = tabs[next]
            if (item && !disabled) {
              event.preventDefault()
              onTabChange(item.id)
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
            }
          }}
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              disabled={disabled}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'shrink-0 border-b-2 border-transparent pb-0 text-sm leading-5 font-normal text-cream hover:text-amber disabled:opacity-50 md:text-15',
                tab === item.id && 'border-copper font-bold text-amber md:font-medium',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex max-w-full shrink-0 items-center gap-0 text-15">
          <label htmlFor={id} className="mr-1 hidden whitespace-nowrap md:block">
            Ordenar por:
          </label>
          <Select
            value={sort}
            onValueChange={(value) => {
              const next = sorts.find((item) => item.id === value)
              if (next) onSortChange(next.id)
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={id}
              aria-label="Ordenar por"
              className="h-[22px] w-5 min-w-0 gap-1 rounded-none border-0 p-0 text-xs data-[size=default]:h-[22px] md:w-auto md:text-15"
            >
              <span className="hidden md:inline-flex">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {sorts.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {resultSummary}
      </p>
    </div>
  )
}
