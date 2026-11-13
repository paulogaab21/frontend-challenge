import type { CollectorInput, LoginRequest } from '@/contracts'
import { createCouponFixtures } from '@/mocks/fixtures/coupons'
import { CATALOG_EPOCH, NFT_IDS } from '@/mocks/fixtures/nfts'
import { createUserFixtures, createWalletFixtures, USER_IDS } from '@/mocks/fixtures/users'

export { NFT_IDS, USER_IDS }

export const FIXED_NOW = '2026-07-29T15:00:00.000Z'

const fixtureUsers = createUserFixtures()

function user(id: string, password: string) {
  const fixture = fixtureUsers.find((entry) => entry.id === id)
  if (!fixture) throw new Error(`Missing fixture user ${id}`)
  return { id: fixture.id, email: fixture.email, password } satisfies LoginRequest & { id: string }
}

export const users = {
  ana: user(USER_IDS.ana, 'Kurio@2026'),
  bruno: user(USER_IDS.bruno, 'Colecao#77'),
}

function coupon(code: string): string {
  const fixture = createCouponFixtures(CATALOG_EPOCH).find((entry) => entry.code === code)
  if (!fixture) throw new Error(`Missing fixture coupon ${code}`)
  return fixture.code
}

export const coupons = {
  percentage: coupon('KURIO10'),
  fixed: coupon('GENESIS'),
  temporary: coupon('RELAMPAGO'),
  expired: coupon('EXPIRADO'),
}

const primary = createWalletFixtures().find(
  (wallet) => wallet.userId === USER_IDS.ana && wallet.role === 'primary',
)
if (!primary) throw new Error('Missing Ana primary wallet fixture')
export const anaWallet = primary

export const anaCollector: CollectorInput = {
  displayName: primary.displayName,
  username: fixtureUsers.find((entry) => entry.id === USER_IDS.ana)!.username,
  network: primary.network,
  profileName: primary.profileName,
  walletAddress: primary.address,
  secondaryAddress: primary.secondaryAddress,
  provider: primary.provider,
  referralCode: primary.referralCode,
  email: primary.email,
  ensName: primary.ensName,
  ensSuffix: primary.ensSuffix,
  note: null,
}
