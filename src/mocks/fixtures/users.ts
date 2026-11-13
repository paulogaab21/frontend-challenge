import { type EnsSuffix, type NetworkId, type WalletProvider, type WalletRole } from '@/contracts'

import { CATALOG_EPOCH, NFT_IDS } from './nfts'

/**
 * Fictitious accounts. Passwords are never stored in clear text: the fixtures carry
 * the salted PBKDF2 hash produced by `node scripts/hash-password.mjs <password>`.
 * The plain credentials are listed in the README for whoever runs the demo.
 */

export interface UserRecord {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  ensName: string
  ensSuffix: EnsSuffix
  walletNickname: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface WalletRecord {
  id: string
  userId: string
  role: WalletRole
  displayName: string
  nickname: string
  network: NetworkId
  profileName: string
  address: string
  secondaryAddress: string | null
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
  sameAsPrimary: boolean
  createdAt: string
  updatedAt: string
  version: number
}

const createdAt = new Date(CATALOG_EPOCH - 90 * 86_400_000).toISOString()

export const USER_IDS = {
  ana: 'usr_ana',
  bruno: 'usr_bruno',
} as const

export function createUserFixtures(): UserRecord[] {
  return [
    {
      id: USER_IDS.ana,
      email: 'ana@kurio.test',
      username: 'ana.souza',
      displayName: 'Ana Souza',
      avatarUrl: null,
      ensName: 'nova.kurio',
      ensSuffix: '.eth',
      walletNickname: 'Principal',
      passwordSalt: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      passwordHash: '5f25f7c6dd68cbb2f51678d76d57101f5d37593d2421c4ba6c8602d6c51ced6c',
      createdAt,
      updatedAt: createdAt,
      version: 1,
    },
    {
      id: USER_IDS.bruno,
      email: 'bruno@kurio.test',
      username: 'bruno.lima',
      displayName: 'Bruno Lima',
      avatarUrl: null,
      ensName: 'bruno.lima',
      ensSuffix: '.eth',
      walletNickname: 'Cofre',
      passwordSalt: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
      passwordHash: 'b76f0d499b31cc475e674c06006af4acc9a06a951e3c24b07a7cc32f85f6f44d',
      createdAt,
      updatedAt: createdAt,
      version: 1,
    },
  ]
}

/** Ana starts with both wallets registered; Bruno has none (exercises the empty state). */
export function createWalletFixtures(): WalletRecord[] {
  return [
    {
      id: 'wal_ana_primary',
      userId: USER_IDS.ana,
      role: 'primary',
      displayName: 'Ana Souza',
      nickname: 'Principal',
      network: 'ethereum',
      profileName: 'Ana Souza',
      address: '0xA91F3C5D7E9B1A2C4D6E8F0A1B3C5D7E9F1AE82C',
      secondaryAddress: 'nova.kurio.eth',
      provider: 'metamask',
      referralCode: 'KURIO2026',
      email: 'ana@kurio.test',
      ensName: 'nova.kurio',
      ensSuffix: '.eth',
      sameAsPrimary: false,
      createdAt,
      updatedAt: createdAt,
      version: 1,
    },
    {
      id: 'wal_ana_secondary',
      userId: USER_IDS.ana,
      role: 'secondary',
      displayName: 'Ana Souza',
      nickname: 'Reserva',
      network: 'polygon',
      profileName: 'Ana Reserva',
      address: '0x5B7D9F1A3C5E7A9B1D3F5A7C9E1B3D5F7A9C2D4E',
      secondaryAddress: null,
      provider: 'coinbase',
      referralCode: 'KURIO2026',
      email: 'ana@kurio.test',
      ensName: 'reserva.kurio',
      ensSuffix: '.eth',
      sameAsPrimary: false,
      createdAt,
      updatedAt: createdAt,
      version: 1,
    },
  ]
}

/** Favorites per user: different sets, so tests can prove the data never leaks across users. */
export function createFavoriteFixtures(): Record<string, string[]> {
  return {
    [USER_IDS.ana]: [NFT_IDS.neonVessel, NFT_IDS.goldenBeat],
    [USER_IDS.bruno]: [NFT_IDS.ivoryBaron],
  }
}
