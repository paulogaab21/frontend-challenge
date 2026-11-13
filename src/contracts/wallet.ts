import { z } from 'zod'

import { emailSchema } from './auth'
import {
  isoDateSchema,
  networkIdSchema,
  versionSchema,
  walletProviderSchema,
  type NetworkId,
} from './common'
import { displayNameSchema, ensNameSchema, ensSuffixSchema, walletNicknameSchema } from './profile'

export const walletRoleSchema = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof walletRoleSchema>

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const ENS_NAME = /^[a-z0-9]+([.-][a-z0-9]+)*\.(eth|xyz|art)$/

export function isValidAddress(address: string, network: NetworkId): boolean {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

export function addressHint(network: NetworkId | undefined): string {
  return network === 'solana'
    ? 'Informe um endereço Solana válido (32 a 44 caracteres base58)'
    : 'Informe um endereço 0x com 40 caracteres hexadecimais'
}

/** "0xA91F…E82C" — the shortened form used across the layout. */
export function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/* -------------------------------------------------------------------------- */
/* Resource                                                                   */
/* -------------------------------------------------------------------------- */

export const walletSchema = z.object({
  id: z.string(),
  role: walletRoleSchema,
  displayName: z.string(),
  nickname: z.string(),
  network: networkIdSchema,
  profileName: z.string(),
  address: z.string(),
  /** Optional ENS name or backup address shown next to the main address. */
  secondaryAddress: z.string().nullable(),
  provider: walletProviderSchema,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  /** True when the secondary wallet mirrors the primary one. */
  sameAsPrimary: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  version: versionSchema,
})
export type Wallet = z.infer<typeof walletSchema>

/** GET /wallets */
export const walletsResponseSchema = z.object({
  items: z.array(walletSchema),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

export const walletFieldsSchema = z
  .object({
    displayName: displayNameSchema,
    nickname: walletNicknameSchema,
    network: networkIdSchema,
    profileName: z
      .string()
      .trim()
      .min(2, 'Use pelo menos 2 caracteres')
      .max(40, 'Use no máximo 40 caracteres'),
    address: z.string().trim().min(1, 'Informe o endereço da carteira'),
    secondaryAddress: z
      .string()
      .trim()
      .max(64, 'Use no máximo 64 caracteres')
      .nullable()
      .transform((value) => (value ? value : null)),
    provider: walletProviderSchema,
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4,12}$/, 'Use de 4 a 12 letras ou números'),
    email: emailSchema,
    ensName: ensNameSchema,
    ensSuffix: ensSuffixSchema,
  })
  .superRefine((value, ctx) => {
    if (value.address && !isValidAddress(value.address, value.network)) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: addressHint(value.network) })
    }
    const secondary = value.secondaryAddress
    if (secondary && !ENS_NAME.test(secondary) && !isValidAddress(secondary, value.network)) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondaryAddress'],
        message: 'Informe um nome ENS (ex.: nova.kurio.eth) ou um endereço válido',
      })
    }
  })
export type WalletFields = z.infer<typeof walletFieldsSchema>
/** Raw form values before the schema normalizes them. */
export type WalletFieldsInput = z.input<typeof walletFieldsSchema>

/** POST /wallets */
export const createWalletRequestSchema = walletFieldsSchema.and(
  z.object({
    role: walletRoleSchema,
    sameAsPrimary: z.boolean().optional(),
  }),
)
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>

/** PUT /wallets/:walletId */
export const updateWalletRequestSchema = walletFieldsSchema.and(
  z.object({ sameAsPrimary: z.boolean().optional() }),
)
export type UpdateWalletRequest = z.infer<typeof updateWalletRequestSchema>

/* -------------------------------------------------------------------------- */
/* Connection simulation                                                      */
/* -------------------------------------------------------------------------- */

export const walletConnectionStatusSchema = z.enum(['connected', 'disconnected'])
export type WalletConnectionStatus = z.infer<typeof walletConnectionStatusSchema>

/** A (simulated) live link between the session and a wallet app. */
export const walletConnectionSchema = z.object({
  /** Stable id of the connection; sent when creating the order. */
  id: z.string(),
  /** Registered wallet behind the connection; null for a wallet typed at checkout. */
  walletId: z.string().nullable(),
  provider: walletProviderSchema,
  network: networkIdSchema,
  address: z.string(),
  status: walletConnectionStatusSchema,
  connectedAt: isoDateSchema,
  version: versionSchema,
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

/**
 * POST /wallet-connections — asks the wallet app to connect.
 * 201 with the connection, or 403 WALLET_CONNECTION_REJECTED when the collector
 * refuses the request in the wallet.
 */
export const connectWalletRequestSchema = z
  .object({
    walletId: z.string().nullable(),
    address: z.string().trim().min(1, 'Informe o endereço da carteira'),
    provider: walletProviderSchema,
    network: networkIdSchema,
  })
  .superRefine((value, ctx) => {
    if (value.address && !isValidAddress(value.address, value.network)) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: addressHint(value.network) })
    }
  })
export type ConnectWalletRequest = z.infer<typeof connectWalletRequestSchema>

/** GET /wallet-connections/current — the live connection of the session, if any. */
export const activeConnectionResponseSchema = z.object({
  connection: walletConnectionSchema.nullable(),
})
export type ActiveConnectionResponse = z.infer<typeof activeConnectionResponseSchema>
