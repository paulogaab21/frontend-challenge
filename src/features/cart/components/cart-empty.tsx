import { CartIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'

export interface CartEmptyProps {
  to: string
}

export function CartEmpty({ to }: CartEmptyProps) {
  return (
    <section className="flex min-h-[274px] flex-col items-center justify-center gap-4 rounded-lg bg-surface p-6 text-center">
      <CartIcon size={40} className="text-copper" />
      <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
      <p className="text-sm text-sand">Encontre sua próxima obra e comece sua coleção.</p>
      <Button asChild className="max-w-full whitespace-normal">
        <SiteLink to={to}>Explorar NFTs</SiteLink>
      </Button>
    </section>
  )
}
