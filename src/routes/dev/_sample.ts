import type { NftDetail, NftFacets, NftSummary, Profile, Wallet } from '@/contracts'
import { createNftFixtures, CATEGORY_LABELS, NETWORK_LABELS } from '@/mocks/fixtures/nfts'
import { createUserFixtures, createWalletFixtures } from '@/mocks/fixtures/users'
import type { HeroSlide } from '@/features/catalog/components/hero-carousel'
const records = createNftFixtures()
export const sampleNfts: NftDetail[] = records.slice(0, 18).map((record) => ({
  ...record,
  price: record.editions.find((edition) => edition.id === record.defaultEditionId)?.price ?? '0',
  available: record.editions.reduce((sum, edition) => sum + edition.available, 0),
}))
export const sampleNft: NftDetail = sampleNfts[0]!
export const sampleCards: NftSummary[] = sampleNfts.slice(0, 9)
export const sampleFacets: NftFacets = {
  categories: Object.entries(CATEGORY_LABELS).map(([id, label], index) => ({
    id,
    label,
    count: [33, 12, 65, 39, 23, 17, 19, 13, 18][index] ?? 0,
  })),
  networks: Object.entries(NETWORK_LABELS).map(([id, label], index) => ({
    id,
    label,
    count: [119, 78, 86][index] ?? 0,
  })),
  price: { min: '0.02', max: '12.30' },
}
export const sampleSlides: HeroSlide[] = [
  {
    id: 'welcome',
    eyebrow: 'Bem-vindo à Kurio',
    title: ['SEJA DONO DO FUTURO', 'DA ARTE DIGITAL'],
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/dev/catalog#mercado',
    artwork: 'emerald-ape',
    secondaryArtwork: 'violet-nomad',
    mobileTitle: ['SEJA DONO DA', 'CULTURA DIGITAL'],
    mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
  },
  {
    id: 'drops',
    eyebrow: 'Bem-vindo à Kurio',
    title: ['Lançamentos gênesis', 'de edição limitada'],
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/dev/catalog#mercado',
    artwork: 'violet-nomad',
    secondaryArtwork: 'emerald-ape',
  },
  {
    id: 'curated',
    eyebrow: 'Bem-vindo à Kurio',
    title: ['Arte digital selecionada', 'e muito mais'],
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    ctaLabel: 'EXPLORAR',
    ctaTo: '/dev/catalog#mercado',
    artwork: 'ivory-baron',
    secondaryArtwork: 'golden-beat',
  },
]
const user = createUserFixtures()[0]!
export const sampleProfile: Profile = {
  id: user.id,
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName,
  ensSuffix: user.ensSuffix,
  walletNickname: user.walletNickname,
  avatarUrl: user.avatarUrl,
  updatedAt: user.updatedAt,
  version: user.version,
}
export const sampleWallets: Wallet[] = createWalletFixtures().map(
  ({ userId: _userId, ...wallet }) => wallet,
)
export const nftHref = (nft: NftSummary) => `/dev/nft#${nft.id}`
