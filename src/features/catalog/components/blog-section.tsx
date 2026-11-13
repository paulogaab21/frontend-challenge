import type { ArtworkId } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { SiteLink } from '@/components/layout/site-link'
export interface BlogArticle {
  id: string
  title: string
  description: string
  date: string
  readingMinutes: number
  artwork: ArtworkId
  to: string
}
export interface BlogSectionProps {
  items?: BlogArticle[]
  title?: string
  description?: string
}
const defaults: BlogArticle[] = [
  {
    id: 'propriedade',
    title: 'Como funciona a propriedade de NFTs',
    description: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    date: '12 de setembro',
    readingMinutes: 6,
    artwork: 'ivory-baron',
    to: '/em-breve/propriedade',
  },
  {
    id: 'artistas',
    title: '10 artistas digitais para acompanhar',
    description: 'Conheça criadores que moldam a cultura digital.',
    date: '13 de setembro',
    readingMinutes: 2,
    artwork: 'emerald-ape',
    to: '/em-breve/artistas',
  },
  {
    id: 'raridade',
    title: 'Raridade, atributos e procedência',
    description: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    date: '15 de setembro',
    readingMinutes: 3,
    artwork: 'violet-nomad',
    to: '/em-breve/raridade',
  },
  {
    id: 'seguranca',
    title: 'Como proteger sua carteira',
    description: 'Proteja sua carteira, seus ativos e sua identidade.',
    date: '15 de setembro',
    readingMinutes: 2,
    artwork: 'golden-beat',
    to: '/em-breve/seguranca',
  },
]
export function BlogSection({
  items = defaults,
  title = 'Diário da Cunhagem',
  description = 'Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.',
}: BlogSectionProps) {
  return (
    <section>
      <h2 className="text-center text-28 leading-9 font-bold">{title}</h2>
      <p className="mt-3 text-center text-sm leading-6 text-sand">{description}</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:pr-14">
        {items.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-lg bg-surface">
            <div className="h-[195px] overflow-hidden">
              <Artwork
                id={item.artwork}
                sizes="(min-width:1280px) 268px, (min-width:640px) 45vw, calc(100vw - 48px)"
                alt=""
                className="h-[195px] w-full"
              />
            </div>
            <article className="p-4">
              <p className="text-xs leading-4 font-medium text-sand">
                {item.date} &nbsp;|&nbsp; Leitura de {item.readingMinutes} min
              </p>
              <h3 className="mt-2 text-base leading-[21px] font-bold">{item.title}</h3>
              <p className="mt-2 text-xs leading-4 font-medium text-sand">{item.description}</p>
              <SiteLink
                to={item.to}
                className="mt-2 inline-flex items-center gap-2 text-xs leading-4 font-bold text-amber"
                aria-label={`Ler mais: ${item.title}`}
              >
                Ler mais <span aria-hidden="true">→</span>
              </SiteLink>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
