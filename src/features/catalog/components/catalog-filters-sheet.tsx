import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { CatalogFilters, type CatalogFiltersProps } from './catalog-filters'
export interface CatalogFiltersSheetProps extends CatalogFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply?: () => void
}
export function CatalogFiltersSheet({
  open,
  onOpenChange,
  onApply,
  ...filters
}: CatalogFiltersSheetProps) {
  const [reset, setReset] = useState(0)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="gap-0 border-r-0 border-b-[10px] border-l-0">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CatalogFilters key={reset} {...filters} className="w-full lg:w-full" />
        </div>
        <SheetFooter className="sticky bottom-0 flex-row bg-surface">
          <Button
            variant="outline"
            onClick={() => {
              setReset((value) => value + 1)
              filters.onClear()
            }}
            disabled={filters.pending}
          >
            Limpar
          </Button>
          <Button
            className="flex-1"
            disabled={filters.pending}
            onClick={() => {
              onApply?.()
              onOpenChange(false)
            }}
          >
            Ver resultados
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
