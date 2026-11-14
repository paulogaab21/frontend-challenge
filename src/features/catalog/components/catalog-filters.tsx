import { useState } from 'react'
import {
  categoryIdSchema,
  networkIdSchema,
  type CategoryId,
  type NetworkId,
  type NftFacets,
} from '@/contracts'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CatalogPriceRange } from './catalog-price-range'

export interface CatalogFilterValue {
  category: CategoryId[]
  network: NetworkId[]
  priceMin?: string
  priceMax?: string
}
export interface CatalogFiltersProps {
  facets: NftFacets
  value: CatalogFilterValue
  onChange: (next: CatalogFilterValue) => void
  onClear: () => void
  pending?: boolean
  className?: string
}
export function CatalogFilters({
  facets,
  value,
  onChange,
  onClear,
  pending,
  className,
}: CatalogFiltersProps) {
  const [rangeReset, setRangeReset] = useState(0)
  const clear = () => {
    setRangeReset((count) => count + 1)
    onClear()
  }
  const active =
    value.category.length > 0 ||
    value.network.length > 0 ||
    value.priceMin !== undefined ||
    value.priceMax !== undefined
  const toggleCategory = (raw: string) => {
    const parsed = categoryIdSchema.safeParse(raw)
    if (parsed.success)
      onChange({
        ...value,
        category: value.category.includes(parsed.data)
          ? value.category.filter((item) => item !== parsed.data)
          : [...value.category, parsed.data],
      })
  }
  const toggleNetwork = (raw: string) => {
    const parsed = networkIdSchema.safeParse(raw)
    if (parsed.success)
      onChange({
        ...value,
        network: value.network.includes(parsed.data)
          ? value.network.filter((item) => item !== parsed.data)
          : [...value.network, parsed.data],
      })
  }
  return (
    <aside
      aria-label="Filtros do catálogo"
      aria-busy={pending || undefined}
      className={cn('w-full bg-surface p-5 text-15 lg:w-[310px]', className)}
    >
      <fieldset disabled={pending}>
        <legend className="mb-3 text-lg leading-4 font-bold">Coleções</legend>
        <ul>
          {facets.categories.map((facet) => (
            <li key={facet.id}>
              <button
                type="button"
                onClick={() => toggleCategory(facet.id)}
                aria-pressed={value.category.some((item) => item === facet.id)}
                className={cn(
                  'relative flex min-h-10 w-full items-center justify-between gap-2 pr-3 pl-3 text-left text-sand hover:text-amber disabled:cursor-not-allowed',
                  facet.count === 0 && 'opacity-50',
                  value.category.some((item) => item === facet.id) && 'text-amber',
                )}
              >
                <span className="flex items-center gap-1">
                  {value.category.some((item) => item === facet.id) && (
                    <CheckIcon size={12} className="absolute -left-1" />
                  )}
                  {facet.label}
                </span>
                <span className="font-bold">({facet.count})</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <CatalogPriceRange
        key={`${rangeReset}:${facets.price.min}:${facets.price.max}:${value.priceMin ?? ''}:${value.priceMax ?? ''}`}
        bounds={facets.price}
        priceMin={value.priceMin}
        priceMax={value.priceMax}
        pending={pending}
        onApply={(priceMin, priceMax) => onChange({ ...value, priceMin, priceMax })}
      />
      <fieldset disabled={pending} className="mt-10">
        <legend className="mb-3 text-lg leading-4 font-bold">Rede</legend>
        <ul>
          {facets.networks.map((facet) => (
            <li key={facet.id}>
              <button
                type="button"
                onClick={() => toggleNetwork(facet.id)}
                aria-pressed={value.network.some((item) => item === facet.id)}
                className={cn(
                  'relative flex min-h-10 w-full items-center justify-between gap-2 pl-3 text-left text-sand hover:text-amber',
                  facet.count === 0 && 'opacity-50',
                  value.network.some((item) => item === facet.id) && 'text-amber',
                )}
              >
                <span>
                  {value.network.some((item) => item === facet.id) && (
                    <CheckIcon size={12} className="absolute top-3.5 -left-1" />
                  )}
                  {facet.label}
                </span>
                <span>({facet.count})</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      {active && (
        <Button variant="link" className="mt-5 text-sm" disabled={pending} onClick={clear}>
          Limpar filtros
        </Button>
      )}
    </aside>
  )
}
