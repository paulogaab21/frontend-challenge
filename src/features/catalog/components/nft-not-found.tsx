import { SearchIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
export interface NftNotFoundProps {
  catalogTo?: string
}
export function NftNotFound({ catalogTo = '/' }: NftNotFoundProps) {
  return (
    <section className="flex min-h-[476px] flex-col items-center justify-center gap-5 p-6 text-center">
      <SearchIcon size={40} className="text-copper" />
      <h1 className="text-28 font-bold">NFT não encontrado</h1>
      <p className="text-sand">Esta obra não está disponível no mercado.</p>
      <Button asChild>
        <SiteLink to={catalogTo}>Voltar ao catálogo</SiteLink>
      </Button>
    </section>
  )
}
