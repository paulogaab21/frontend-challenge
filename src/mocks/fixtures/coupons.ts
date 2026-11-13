import type { NetworkId } from '@/contracts'
import type { EthAmount } from '@/lib/money'

export interface CouponRecord {
  code: string
  description: string
  /** Percentage discount in basis points (1000 = 10%); null for fixed discounts. */
  basisPoints: number | null
  /** Fixed discount in ETH; null for percentage discounts. */
  amount: EthAmount | null
  /** Minimum subtotal required to use the coupon. */
  minSubtotal: EthAmount | null
  /** ISO instant after which the coupon is rejected; null = never expires. */
  expiresAt: string | null
}

/**
 * Deterministic coupon cases:
 * - KURIO10   → 10% off, always valid
 * - GENESIS   → 0.05 ETH off, requires a subtotal of at least 1 ETH
 * - RELAMPAGO → 15% off, expires two hours after the database is seeded — valid
 *               right after a reset, expired once the clock moves past that window
 * - EXPIRADO  → expired 30 days before the database was seeded
 * - anything else → invalid
 */
/** @param now Instant the database is being seeded at (epoch milliseconds). */
export function createCouponFixtures(now: number): CouponRecord[] {
  return [
    {
      code: 'KURIO10',
      description: '10% de desconto do lançamento',
      basisPoints: 1000,
      amount: null,
      minSubtotal: null,
      expiresAt: null,
    },
    {
      code: 'GENESIS',
      description: '0.05 ETH de desconto em compras a partir de 1 ETH',
      basisPoints: null,
      amount: '0.05',
      minSubtotal: '1',
      expiresAt: null,
    },
    {
      code: 'RELAMPAGO',
      description: '15% de desconto por tempo limitado',
      basisPoints: 1500,
      amount: null,
      minSubtotal: null,
      expiresAt: new Date(now + 2 * 3_600_000).toISOString(),
    },
    {
      code: 'EXPIRADO',
      description: '20% de desconto de pré-lançamento',
      basisPoints: 2000,
      amount: null,
      minSubtotal: null,
      expiresAt: new Date(now - 30 * 86_400_000).toISOString(),
    },
  ]
}

/** Estimated network fee per settlement network. */
export function createFeeFixtures(): Record<NetworkId, EthAmount> {
  return {
    ethereum: '0.016',
    polygon: '0.002',
    solana: '0.001',
  }
}
