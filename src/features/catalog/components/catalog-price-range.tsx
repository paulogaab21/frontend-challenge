import { useState } from 'react'
import type { NftFacets } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatEth } from '@/lib/money'
import { priceToStep, stepToPrice } from './price-range'
export interface CatalogPriceRangeProps {
  bounds: NftFacets['price']
  priceMin?: string
  priceMax?: string
  onApply: (priceMin: string, priceMax: string) => void
  pending?: boolean
}
export function CatalogPriceRange({
  bounds,
  priceMin,
  priceMax,
  onApply,
  pending,
}: CatalogPriceRangeProps) {
  const min = priceToStep(bounds.min, true)
  const max = Math.max(min, priceToStep(bounds.max))
  const [range, setRange] = useState(() => [
    Math.max(min, Math.min(max, priceToStep(priceMin ?? bounds.min, true))),
    Math.max(min, Math.min(max, priceToStep(priceMax ?? bounds.max))),
  ])
  return (
    <fieldset disabled={pending} className="mt-10">
      <legend className="mb-[13.5px] text-lg leading-4 font-bold">Faixa de preço</legend>
      <div className="pl-3">
        <Slider
          className="h-[18px]"
          min={min}
          max={max}
          step={1}
          value={range}
          onValueChange={setRange}
          disabled={pending || min === max}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
        />
        <p className="mt-[11.5px] leading-6 whitespace-nowrap text-cream">
          Preço: {formatEth(stepToPrice(range[0] ?? min), { unit: false }).replace('.', ',')} -{' '}
          {formatEth(stepToPrice(range[1] ?? max), { unit: false }).replace('.', ',')} ETH
        </p>
        <Button
          size="sm"
          className="mt-2.5 w-[92px]"
          disabled={pending}
          onClick={() => onApply(stepToPrice(range[0] ?? min), stepToPrice(range[1] ?? max))}
        >
          Aplicar
        </Button>
      </div>
    </fieldset>
  )
}
