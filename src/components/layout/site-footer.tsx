import { useId, type FormEvent } from 'react'
import { SiteLink as Link } from '@/components/layout/site-link'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/components/ui/class-names'

export interface FooterLink {
  label: string
  to: string
}
export interface FooterLinkColumn {
  title: string
  links: readonly FooterLink[]
}
export interface SiteFooterProps {
  onNewsletterSubmit?: (email: string) => void | Promise<void>
  newsletterPending?: boolean
  newsletterMessage?: string
  newsletterError?: string
  linkColumns?: readonly FooterLinkColumn[]
  socialLinks?: Partial<
    Record<'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube', string>
  >
  email?: string
  phone?: string
  year?: number
  className?: string
}
const services = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    description:
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]
const defaultColumns: readonly FooterLinkColumn[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/conta/perfil' },
      { label: 'Minha coleção', to: '/em-breve/colecao' },
      { label: 'Atividade', to: '/em-breve/atividade' },
      { label: 'Estúdio do criador', to: '/em-breve/estudio' },
      { label: 'Lista de interesse', to: '/conta/favoritos' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', to: '/em-breve/ajuda' },
      { label: 'Como comprar NFTs', to: '/em-breve/como-comprar' },
      { label: 'Carteira e segurança', to: '/em-breve/seguranca' },
      { label: 'Política do mercado', to: '/em-breve/politica' },
      { label: 'Denunciar item', to: '/em-breve/denunciar' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', to: '/?colecao=arte-digital' },
      { label: 'Fotografia', to: '/?colecao=fotografia' },
      { label: 'Música', to: '/?colecao=musica' },
      { label: 'Arte 3D', to: '/?colecao=arte-3d' },
      { label: 'Utilidade', to: '/?colecao=utilidade' },
    ],
  },
]
const socials = [
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { id: 'twitter', label: 'Twitter', Icon: TwitterIcon },
  { id: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { id: 'youtube', label: 'YouTube', Icon: YoutubeIcon },
] as const

export function SiteFooter({
  onNewsletterSubmit,
  newsletterPending = false,
  newsletterMessage,
  newsletterError,
  linkColumns = defaultColumns,
  socialLinks,
  email = 'contato@email.com',
  phone = '+55 11 4002 8922',
  year = 2026,
  className,
}: SiteFooterProps) {
  const id = useId()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('email')
    if (typeof value === 'string' && !newsletterPending) void onNewsletterSubmit?.(value.trim())
  }
  return (
    <footer className={cn('container-page', className)}>
      <div className="grid grid-cols-1 gap-8 bg-surface p-6 md:grid-cols-2 md:p-8 xl:grid-cols-[repeat(3,minmax(0,1fr))_325px] xl:gap-4 xl:pt-8 xl:pr-[30px] xl:pb-4 xl:pl-12">
        {services.map((service) => (
          <div
            key={service.mark}
            className="border-b border-copper pb-6 md:border-r md:border-b-0 md:pr-4 md:pb-0"
          >
            <div
              className="flex size-[74px] items-center justify-center rounded-full bg-copper text-2xl font-bold text-ink"
              aria-hidden="true"
            >
              {service.mark}
            </div>
            <h2 className="mt-2.5 text-17 leading-5 font-bold">{service.title}</h2>
            <p className="mt-2.5 max-w-[200px] text-sm leading-[22px] text-sand">
              {service.description}
            </p>
          </div>
        ))}
        <div>
          <h2 className="max-w-[270px] text-lg leading-4 font-bold">
            Antecipe-se ao próximo lançamento
          </h2>
          <form onSubmit={submit} className="mt-4" aria-label="Novidades da Kurio">
            <Label htmlFor={id} className="sr-only">
              Seu e-mail
            </Label>
            <div className="flex h-10 overflow-hidden rounded-md bg-band shadow-lg">
              <Input
                id={id}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="digite seu e-mail..."
                aria-invalid={!!newsletterError}
                aria-describedby={
                  newsletterError || newsletterMessage ? `${id}-message` : undefined
                }
                disabled={newsletterPending}
                className="h-10 flex-1 rounded-r-none border-0 bg-band px-3"
              />
              <Button
                type="submit"
                loading={newsletterPending}
                className="h-10 w-[85px] justify-start rounded-l-none pr-0 pl-4 text-lg"
              >
                Enviar
              </Button>
            </div>
          </form>
          {(newsletterError || newsletterMessage) && (
            <p
              id={`${id}-message`}
              role={newsletterError ? 'alert' : 'status'}
              className={cn('mt-2 text-xs', newsletterError ? 'text-coral' : 'text-sand')}
            >
              {newsletterError ?? newsletterMessage}
            </p>
          )}
          <p className="mt-3 text-13 leading-[22px] text-sand">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </div>
      </div>
      <div className="grid min-h-[88px] items-center gap-6 bg-band px-8 py-6 text-sm leading-[22px] md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_228px] xl:gap-8 xl:py-0">
        <Link to="/" aria-label="Kurio — Início" className="w-fit font-bold tracking-brand">
          KURIO
        </Link>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href={`mailto:${email}`} className="w-fit break-all hover:text-amber">
          {email}
        </a>
        <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="w-fit hover:text-amber">
          {phone}
        </a>
      </div>
      <div className="grid gap-8 bg-surface p-8 md:grid-cols-2 xl:min-h-[236px] xl:grid-cols-[repeat(3,minmax(0,1fr))_228px]">
        {linkColumns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-lg leading-4 font-bold">{column.title}</h2>
            <ul className="mt-[11px] space-y-1.5 text-sm leading-6">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-amber hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
          <ul className="mt-[19px] flex flex-wrap gap-2">
            {socials.map(({ id: socialId, label, Icon }) => (
              <li key={socialId}>
                {socialLinks?.[socialId] ? (
                  <a
                    href={socialLinks[socialId]}
                    aria-label={label}
                    className="flex size-8 items-center justify-center rounded-[5px] border border-copper text-copper hover:bg-copper/10"
                  >
                    <Icon />
                  </a>
                ) : (
                  <Link
                    to={`/em-breve/${socialId}`}
                    aria-label={label}
                    className="flex size-8 items-center justify-center rounded-[5px] border border-copper text-copper hover:bg-copper/10"
                  >
                    <Icon />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <h2 className="mt-[31px] text-lg leading-4 font-bold">Carteiras compatíveis</h2>
          <Badge
            variant="outline"
            className="mt-3 min-h-[26px] max-w-full justify-start py-0 pr-0 pl-[10px] text-2xs leading-3 font-bold tracking-[0.1px] whitespace-normal xl:whitespace-nowrap"
          >
            METAMASK&nbsp; • &nbsp;WALLETCONNECT&nbsp; • &nbsp;COINBASE
          </Badge>
        </div>
      </div>
      <p className="pt-[9px] pb-[27px] text-center text-sm leading-6">
        © {year} Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
