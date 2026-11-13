import { SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
export interface CatalogEmptyProps {
  onClear: () => void
  hint?: string
}
export function CatalogEmpty({
  onClear,
  hint = 'Tente ajustar sua busca ou combinar outros filtros.',
}: CatalogEmptyProps) {
  return (
    <section className="flex min-h-[364px] flex-col items-center justify-center gap-4 rounded-lg border border-line p-6 text-center">
      <SearchIcon size={32} className="text-copper" />
      <h2 className="text-xl font-bold">Nenhum NFT encontrado</h2>
      <p className="max-w-md text-sand">{hint}</p>
      <Button variant="outline" onClick={onClear}>
        Limpar filtros
      </Button>
    </section>
  )
}
