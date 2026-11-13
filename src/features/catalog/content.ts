import { type HeroSlide } from './components/hero-carousel'

/**
 * Editorial copy of the home page, as written in the Figma file. This is site
 * content, not catalog data: everything about NFTs comes from the API.
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'bem-vindo',
    eyebrow: 'Bem-vindo à Kurio',
    title: ['SEJA DONO DO FUTURO', 'DA ARTE DIGITAL'],
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/#mercado',
    artwork: 'emerald-ape',
    secondaryArtwork: 'violet-nomad',
    mobileTitle: ['SEJA DONO DA', 'CULTURA DIGITAL'],
    mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
  },
  {
    id: 'lancamentos',
    eyebrow: 'Novos lançamentos',
    title: ['LANÇAMENTOS GÊNESIS', 'DE EDIÇÃO LIMITADA'],
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/?aba=novos#mercado',
    artwork: 'violet-nomad',
    secondaryArtwork: 'golden-beat',
    mobileTitle: ['LANÇAMENTOS', 'GÊNESIS'],
    mobileDescription: 'Edições escassas direto dos criadores.',
  },
  {
    id: 'em-alta',
    eyebrow: 'Em alta',
    title: ['ARTE DIGITAL SELECIONADA', 'E MUITO MAIS'],
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/?aba=em-alta#mercado',
    artwork: 'ivory-baron',
    secondaryArtwork: 'emerald-ape',
    mobileTitle: ['ARTE DIGITAL', 'SELECIONADA'],
    mobileDescription: 'Coleções verificadas e obras que definem a cultura.',
  },
]
