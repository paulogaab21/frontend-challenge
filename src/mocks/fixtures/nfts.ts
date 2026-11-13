import {
  type ArtworkId,
  type CategoryId,
  type Edition,
  type EditionId,
  type GalleryView,
  type NetworkId,
  type NftBadge,
  type NftReview,
} from '@/contracts'
import { type EthAmount, fromWei, toWei } from '@/lib/money'

import { createRandom, pick, randomInt } from '../lib/random'

/**
 * Catalog fixtures. The first nine entries reproduce the cards drawn in the Figma
 * (same names, prices and order); the rest is generated from a fixed seed to give
 * filters, sorting and pagination enough variety.
 */

/** Reference instant of the fixtures (the date printed on the Figma receipt). */
export const CATALOG_EPOCH = Date.UTC(2026, 6, 29, 12, 0, 0)

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  artwork: ArtworkId
  collectionId: string
  collectionName: string
  category: CategoryId
  network: NetworkId
  compareAtPrice: EthAmount | null
  defaultEditionId: EditionId
  editions: Edition[]
  badges: NftBadge[]
  listedAt: string
  description: string
  details: string[]
  attributes: string[]
  gallery: GalleryView[]
  rating: { average: number; count: number }
  reviews: NftReview[]
  creator: { name: string; royaltyPercent: number }
  contract: { address: string; standard: string }
  provenance: string
  updatedAt: string
  version: number
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const NETWORK_LABELS: Record<NetworkId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const EDITION_LABELS: Record<EditionId, string> = {
  unique: '1/1',
  ten: '1/10',
  fifty: '1/50',
  open: 'ABERTA',
}

const EDITION_SUPPLY: Record<EditionId, number | null> = {
  unique: 1,
  ten: 10,
  fifty: 50,
  open: null,
}

const EDITION_MAX_PER_ORDER: Record<EditionId, number> = {
  unique: 1,
  ten: 10,
  fifty: 10,
  open: 10,
}

/** Price of each edition relative to the 1/50 edition, in thousandths. */
const EDITION_RATIO: Record<EditionId, bigint> = {
  unique: 8000n,
  ten: 2500n,
  fifty: 1000n,
  open: 400n,
}

const EDITION_ORDER: EditionId[] = ['unique', 'ten', 'fifty', 'open']

/** Trims a wei amount to 4 fraction digits so generated prices stay readable. */
function roundWei(wei: bigint): bigint {
  const unit = 10n ** 14n
  return (wei / unit) * unit
}

/** Builds the editions of an NFT from the price of its default edition. */
function buildEditions(
  defaultEditionId: EditionId,
  price: EthAmount,
  availability: Partial<Record<EditionId, number>>,
): Edition[] {
  const baseWei = (toWei(price) * 1000n) / EDITION_RATIO[defaultEditionId]
  return EDITION_ORDER.filter((id) => availability[id] !== undefined).map((id) => ({
    id,
    label: EDITION_LABELS[id],
    price:
      id === defaultEditionId ? price : fromWei(roundWei((baseWei * EDITION_RATIO[id]) / 1000n)),
    supply: EDITION_SUPPLY[id],
    available: availability[id] ?? 0,
    maxPerOrder: EDITION_MAX_PER_ORDER[id],
  }))
}

const GALLERY_VIEWS: Array<Omit<GalleryView, 'id' | 'artwork'>> = [
  { label: 'Obra completa', zoom: 1, focus: { x: 50, y: 50 } },
  { label: 'Detalhe do rosto', zoom: 1.9, focus: { x: 52, y: 36 } },
  { label: 'Detalhe do figurino', zoom: 2.1, focus: { x: 50, y: 82 } },
  { label: 'Detalhe do acabamento', zoom: 2.6, focus: { x: 30, y: 30 } },
]

function buildGallery(id: string, artwork: ArtworkId): GalleryView[] {
  return GALLERY_VIEWS.map((view, index) => ({ ...view, id: `${id}-view-${index + 1}`, artwork }))
}

const REVIEW_AUTHORS = ['marina.eth', 'caio.art', 'lu.collects', 'tavares.xyz', 'bia.nomad']
const REVIEW_COMMENTS = [
  'Acabamento impecável e entrega imediata na carteira. Recomendo a coleção.',
  'A arte em alta resolução surpreende. Procedência verificada sem complicação.',
  'Edição muito bem cuidada; o criador responde a comunidade com frequência.',
  'Peça central da minha coleção. Os atributos raros fazem diferença.',
  'Compra tranquila e taxas claras. Voltarei para os próximos lançamentos.',
]

function buildReviews(id: string, seed: number): NftReview[] {
  const random = createRandom(seed)
  return [0, 1, 2].map((index) => ({
    id: `${id}-review-${index + 1}`,
    author: REVIEW_AUTHORS[(seed + index) % REVIEW_AUTHORS.length] ?? 'colecionador',
    rating: randomInt(random, 4, 5),
    comment: REVIEW_COMMENTS[(seed + index * 2) % REVIEW_COMMENTS.length] ?? '',
    createdAt: new Date(CATALOG_EPOCH - (index + 2) * 86_400_000 * 3).toISOString(),
  }))
}

interface Seed {
  name: string
  number: string
  artwork: ArtworkId
  collectionId: string
  category: CategoryId
  network: NetworkId
  price: EthAmount
  compareAtPrice?: EthAmount
  defaultEditionId: EditionId
  availability: Partial<Record<EditionId, number>>
  badges?: NftBadge[]
  attributes: string[]
  creator: string
}

const COLLECTIONS: Record<string, string> = {
  'kurio-apes': 'Kurio Apes',
  'nomad-society': 'Nomad Society',
  'baron-atelier': 'Baron Atelier',
  'golden-frequencies': 'Golden Frequencies',
  'neon-vessels': 'Neon Vessels',
}

/** The nine cards of the home frame, in the order they are drawn. */
const FIGMA_SEEDS: Seed[] = [
  {
    name: 'Emerald Ape',
    number: '042',
    artwork: 'emerald-ape',
    collectionId: 'kurio-apes',
    category: 'arte-digital',
    network: 'ethereum',
    price: '1.19',
    defaultEditionId: 'fifty',
    availability: { unique: 0, ten: 4, fifty: 37, open: 250 },
    badges: ['raro'],
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    creator: 'Nova Sato',
  },
  {
    name: 'Sage Nomad',
    number: '009',
    artwork: 'violet-nomad',
    collectionId: 'nomad-society',
    category: 'colecionaveis',
    network: 'polygon',
    price: '1.69',
    defaultEditionId: 'fifty',
    availability: { ten: 6, fifty: 22, open: 180 },
    attributes: ['Chapéu bucket', 'Moletom', 'Sereno'],
    creator: 'Iara Montes',
  },
  {
    name: 'Neon Vessel',
    number: '552',
    artwork: 'ivory-baron',
    collectionId: 'neon-vessels',
    category: 'arte-3d',
    network: 'solana',
    price: '1.99',
    compareAtPrice: '2.29',
    defaultEditionId: 'fifty',
    availability: { unique: 1, ten: 8, fifty: 41 },
    badges: ['em-alta'],
    attributes: ['Blazer', 'Gola alta', 'Neon'],
    creator: 'Theo Varga',
  },
  {
    name: 'Cosmic Bloom',
    number: '118',
    artwork: 'violet-nomad',
    collectionId: 'kurio-apes',
    category: 'generativa',
    network: 'ethereum',
    price: '1.29',
    defaultEditionId: 'fifty',
    availability: { ten: 3, fifty: 18, open: 120 },
    badges: ['novo'],
    attributes: ['Chapéu bucket', 'Cósmico', 'Floral'],
    creator: 'Nova Sato',
  },
  {
    name: 'Violet Nomad',
    number: '314',
    artwork: 'violet-nomad',
    collectionId: 'kurio-apes',
    category: 'arte-digital',
    network: 'ethereum',
    price: '1.39',
    defaultEditionId: 'fifty',
    availability: { unique: 1, ten: 9, fifty: 30 },
    attributes: ['Moletom violeta', 'Chapéu bucket', 'Nômade'],
    creator: 'Nova Sato',
  },
  {
    name: 'Ivory Baron',
    number: '088',
    artwork: 'ivory-baron',
    collectionId: 'kurio-apes',
    category: 'arte-digital',
    network: 'ethereum',
    price: '1.79',
    defaultEditionId: 'fifty',
    availability: { unique: 0, ten: 10, fifty: 44 },
    badges: ['raro'],
    attributes: ['Blazer marfim', 'Brinco dourado', 'Barão'],
    creator: 'Nova Sato',
  },
  {
    name: 'Golden Beat',
    number: '207',
    artwork: 'golden-beat',
    collectionId: 'kurio-apes',
    category: 'musica',
    network: 'ethereum',
    price: '0.99',
    defaultEditionId: 'fifty',
    availability: { ten: 7, fifty: 26, open: 300 },
    badges: ['em-alta'],
    attributes: ['Fones', 'Dourado', 'Ritmo'],
    creator: 'Nova Sato',
  },
  {
    name: 'Golden Frequency',
    number: '071',
    artwork: 'golden-beat',
    collectionId: 'golden-frequencies',
    category: 'musica',
    network: 'polygon',
    price: '0.59',
    defaultEditionId: 'fifty',
    availability: { fifty: 3, open: 90 },
    badges: ['novo'],
    attributes: ['Fones', 'Frequência', 'Dourado'],
    creator: 'Dandara Reis',
  },
  {
    name: 'Golden Signal',
    number: '160',
    artwork: 'golden-beat',
    collectionId: 'kurio-apes',
    category: 'musica',
    network: 'ethereum',
    price: '0.39',
    defaultEditionId: 'fifty',
    availability: { ten: 2, fifty: 12, open: 400 },
    attributes: ['Fones', 'Sinal', 'Dourado'],
    creator: 'Nova Sato',
  },
]

const ADJECTIVES = [
  'Amber',
  'Crimson',
  'Lunar',
  'Solar',
  'Velvet',
  'Onyx',
  'Jade',
  'Copper',
  'Misty',
  'Indigo',
  'Coral',
  'Silver',
  'Royal',
  'Rustic',
  'Arctic',
] as const

const NOUNS: Array<{ noun: string; artwork: ArtworkId; collectionId: string; trait: string }> = [
  { noun: 'Ape', artwork: 'emerald-ape', collectionId: 'kurio-apes', trait: 'Óculos' },
  { noun: 'Scholar', artwork: 'emerald-ape', collectionId: 'kurio-apes', trait: 'Jaqueta' },
  { noun: 'Nomad', artwork: 'violet-nomad', collectionId: 'nomad-society', trait: 'Moletom' },
  {
    noun: 'Drifter',
    artwork: 'violet-nomad',
    collectionId: 'nomad-society',
    trait: 'Chapéu bucket',
  },
  { noun: 'Baron', artwork: 'ivory-baron', collectionId: 'baron-atelier', trait: 'Blazer' },
  { noun: 'Oracle', artwork: 'ivory-baron', collectionId: 'baron-atelier', trait: 'Gola alta' },
  { noun: 'Vessel', artwork: 'ivory-baron', collectionId: 'neon-vessels', trait: 'Neon' },
  { noun: 'Beat', artwork: 'golden-beat', collectionId: 'golden-frequencies', trait: 'Fones' },
  { noun: 'Echo', artwork: 'golden-beat', collectionId: 'golden-frequencies', trait: 'Eco' },
  { noun: 'Pulse', artwork: 'golden-beat', collectionId: 'golden-frequencies', trait: 'Pulso' },
]

const CATEGORIES: CategoryId[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]
const NETWORKS: NetworkId[] = ['ethereum', 'polygon', 'solana']
const CREATORS = ['Nova Sato', 'Iara Montes', 'Theo Varga', 'Dandara Reis', 'Caetano Luz']
const RARITIES = ['Comum', 'Incomum', 'Raro', 'Épico']
const PRICES: EthAmount[] = [
  '0.02',
  '0.05',
  '0.08',
  '0.12',
  '0.18',
  '0.25',
  '0.33',
  '0.45',
  '0.62',
  '0.74',
  '0.88',
  '1.05',
  '1.24',
  '1.48',
  '1.85',
  '2.2',
  '2.75',
  '3.4',
  '4.1',
  '5.25',
  '6.8',
  '8.5',
  '10.75',
  '12.3',
]

const GENERATED_COUNT = 45

function generatedSeeds(): Seed[] {
  const random = createRandom(20260729)
  const seeds: Seed[] = []
  const used = new Set(FIGMA_SEEDS.map((seed) => seed.name))

  for (let index = 0; index < GENERATED_COUNT; index += 1) {
    const base = NOUNS[index % NOUNS.length]
    if (!base) continue
    let adjective = pick(random, ADJECTIVES)
    while (used.has(`${adjective} ${base.noun}`)) adjective = pick(random, ADJECTIVES)
    used.add(`${adjective} ${base.noun}`)

    // Guarantee that the catalog touches both ends of the price range.
    const price =
      index === 0 ? '0.02' : index === 1 ? '12.3' : (PRICES[randomInt(random, 0, 23)] ?? '1.05')
    const defaultEditionId: EditionId = pick(random, ['fifty', 'fifty', 'ten', 'open'] as const)

    const soldOut = index % 11 === 5
    const availability: Partial<Record<EditionId, number>> = {}
    if (defaultEditionId !== 'open' && random() > 0.45) {
      availability.unique = soldOut ? 0 : randomInt(random, 0, 1)
    }
    if (defaultEditionId !== 'fifty' || random() > 0.3) {
      availability.ten = soldOut ? 0 : randomInt(random, 0, 10)
    }
    if (defaultEditionId !== 'ten' || random() > 0.4) {
      availability.fifty = soldOut ? 0 : randomInt(random, 1, 50)
    }
    if (defaultEditionId === 'open' || random() > 0.6) {
      availability.open = soldOut ? 0 : randomInt(random, 40, 500)
    }
    if (availability[defaultEditionId] === undefined) {
      availability[defaultEditionId] = soldOut ? 0 : randomInt(random, 2, 20)
    }

    const badges: NftBadge[] = []
    if (index % 6 === 0) badges.push('novo')
    if (index % 7 === 3) badges.push('em-alta')
    if (index % 9 === 4) badges.push('raro')

    const discounted = index % 8 === 2
    seeds.push({
      name: `${adjective} ${base.noun}`,
      number: String(randomInt(random, 1, 999)).padStart(3, '0'),
      artwork: base.artwork,
      collectionId: base.collectionId,
      category: CATEGORIES[(index * 4 + 1) % CATEGORIES.length] ?? 'arte-digital',
      network: NETWORKS[(index * 2 + (index % 5)) % NETWORKS.length] ?? 'ethereum',
      price,
      compareAtPrice: discounted ? fromWei((toWei(price) * 115n) / 100n) : undefined,
      defaultEditionId,
      availability,
      badges,
      attributes: [base.trait, adjective, pick(random, RARITIES)],
      creator: pick(random, CREATORS),
    })
  }
  return seeds
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function toRecord(seed: Seed, index: number): NftRecord {
  const id = `${slugify(seed.name)}-${seed.number}`
  const collectionName = COLLECTIONS[seed.collectionId] ?? seed.collectionId
  const networkLabel = NETWORK_LABELS[seed.network]
  const fullName = `${seed.name} #${seed.number}`
  const editions = buildEditions(seed.defaultEditionId, seed.price, seed.availability)
  const defaultEdition = editions.find((edition) => edition.id === seed.defaultEditionId)
  // Newest first: the Figma order is the default "Listados recentemente" order.
  const listedAt = new Date(CATALOG_EPOCH - index * 6 * 3_600_000).toISOString()
  const addressSeed = createRandom(index * 7919 + 17)
  const addressTail = Array.from({ length: 36 }, () =>
    Math.floor(addressSeed() * 16)
      .toString(16)
      .toUpperCase(),
  ).join('')

  return {
    id,
    name: fullName,
    tokenId: `#${seed.number.padStart(4, '0')}`,
    artwork: seed.artwork,
    collectionId: seed.collectionId,
    collectionName,
    category: seed.category,
    network: seed.network,
    compareAtPrice: seed.compareAtPrice ?? null,
    defaultEditionId: seed.defaultEditionId,
    editions,
    badges: seed.badges ?? [],
    listedAt,
    description: `Um colecionável digital finalizado à mão da coleção ${collectionName}, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    details: [
      `${fullName} é uma obra digital ${defaultEdition?.label ?? '1/50'} finalizada à mão da coleção ${collectionName}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${seed.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    attributes: seed.attributes,
    gallery: buildGallery(id, seed.artwork),
    rating: { average: 4.8 - (index % 5) * 0.1, count: 19 + ((index * 7) % 40) },
    reviews: buildReviews(id, index + 3),
    creator: { name: seed.creator, royaltyPercent: 5 },
    contract: {
      address: `0x7A42${addressTail}`,
      standard: seed.network === 'solana' ? 'Metaplex' : 'ERC-721',
    },
    provenance: `Cunhado na ${networkLabel} com procedência imutável e metadados armazenados no IPFS.`,
    updatedAt: listedAt,
    version: 1,
  }
}

/** Builds a fresh copy of the catalog (records are mutated by the mock database). */
export function createNftFixtures(): NftRecord[] {
  return [...FIGMA_SEEDS, ...generatedSeeds()].map(toRecord)
}

/** Ids referenced by other fixtures and by the tests. */
export const NFT_IDS = {
  emeraldApe: 'emerald-ape-042',
  sageNomad: 'sage-nomad-009',
  neonVessel: 'neon-vessel-552',
  cosmicBloom: 'cosmic-bloom-118',
  violetNomad: 'violet-nomad-314',
  ivoryBaron: 'ivory-baron-088',
  goldenBeat: 'golden-beat-207',
  goldenFrequency: 'golden-frequency-071',
  goldenSignal: 'golden-signal-160',
} as const
