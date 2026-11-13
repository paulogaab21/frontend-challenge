import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'

import { StatusPage } from './status-page'

/** Areas the layout links to but that are outside the scope of this delivery. */
const SECTIONS: Record<string, string> = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  'minha-colecao': 'Minha coleção',
  'estudio-do-criador': 'Estúdio do criador',
  ofertas: 'Ofertas',
  'arquivos-baixados': 'Arquivos baixados',
  suporte: 'Suporte',
  'central-de-ajuda': 'Central de ajuda',
  'como-comprar-nfts': 'Como comprar NFTs',
  'carteira-e-seguranca': 'Carteira e segurança',
  'politica-do-mercado': 'Política do mercado',
  'denunciar-item': 'Denunciar item',
  'diario-da-cunhagem': 'Diário da Cunhagem',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}

export interface ComingSoonPageProps {
  section: string
}

/**
 * Honest dead end: editorial pages, support, offers and downloads are not part of
 * this delivery, so their links explain that instead of pretending to work.
 */
export function ComingSoonPage({ section }: ComingSoonPageProps) {
  const name = SECTIONS[section]
  return (
    <StatusPage
      eyebrow="Fora do escopo desta demonstração"
      title={name ? `${name} ainda não está disponível` : 'Esta área ainda não está disponível'}
      description={
        <p>
          Esta demonstração cobre a descoberta de NFTs, a compra e a conta do colecionador.
          {name ? ` A área “${name}” ` : ' Esta área '}
          não faz parte da entrega, por isso o link traz você até aqui em vez de simular um
          conteúdo.
        </p>
      }
      actions={
        <>
          <Button asChild>
            <SiteLink to="/#mercado">Explorar o mercado</SiteLink>
          </Button>
          <Button variant="outline" asChild>
            <SiteLink to="/">Voltar ao início</SiteLink>
          </Button>
        </>
      }
    />
  )
}
