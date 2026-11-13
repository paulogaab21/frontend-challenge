/**
 * Exact ETH arithmetic.
 *
 * ETH amounts travel through the whole system (REST, cache, UI state) as **decimal
 * strings** such as "1.19". Binary floats cannot represent most of those values, so
 * every calculation converts to wei (10^-18 ETH) as a BigInt, operates on integers and
 * converts back. Nothing in the app ever calls parseFloat on a price.
 */

/** A non-negative decimal string with at most 18 fraction digits, e.g. "26.846". */
export type EthAmount = string

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

export function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) {
    throw new TypeError(`Invalid ETH amount: ${JSON.stringify(value)}`)
  }
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** Canonical decimal string: no trailing zeros, no trailing dot ("1.5", "0", "26.846"). */
export function fromWei(wei: bigint): EthAmount {
  if (wei < 0n) throw new RangeError('ETH amounts cannot be negative')
  const whole = wei / WEI_PER_ETH
  const fraction = (wei % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function addEth(...values: EthAmount[]): EthAmount {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

/** a - b, clamped at zero (a discount can never make a total negative). */
export function subEth(a: EthAmount, b: EthAmount): EthAmount {
  const diff = toWei(a) - toWei(b)
  return fromWei(diff > 0n ? diff : 0n)
}

/** Multiplies by an integer quantity. */
export function mulEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative integer, got ${quantity}`)
  }
  return fromWei(toWei(value) * BigInt(quantity))
}

/**
 * Percentage expressed in basis points (1% = 100 bps), rounded half up to the wei.
 * percentOfEth("26.83", 1000) === "2.683"
 */
export function percentOfEth(value: EthAmount, basisPoints: number): EthAmount {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError(`Basis points must be a non-negative integer, got ${basisPoints}`)
  }
  return fromWei((toWei(value) * BigInt(basisPoints) + 5_000n) / 10_000n)
}

/** -1 when a < b, 0 when equal, 1 when a > b. */
export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff < 0n ? -1 : 1
}

export function isZeroEth(value: EthAmount): boolean {
  return toWei(value) === 0n
}

export function minEth(a: EthAmount, b: EthAmount): EthAmount {
  return compareEth(a, b) <= 0 ? a : b
}

export function maxEth(a: EthAmount, b: EthAmount): EthAmount {
  return compareEth(a, b) >= 0 ? a : b
}

export interface FormatEthOptions {
  /** Minimum fraction digits shown. The Figma shows prices with at least two ("1.19"). */
  minFractionDigits?: number
  /** Digits beyond this are cut for display only (never used for math). */
  maxFractionDigits?: number
  /** Appends the " ETH" unit. */
  unit?: boolean
}

/**
 * Display formatting. Keeps every significant digit up to `maxFractionDigits`
 * ("0.016", "26.846") and pads to `minFractionDigits` ("2.50"). Pure string
 * manipulation — no floating point involved.
 */
export function formatEth(value: EthAmount, options: FormatEthOptions = {}): string {
  const { minFractionDigits = 2, maxFractionDigits = 6, unit = true } = options
  const [whole = '0', rawFraction = ''] = fromWei(toWei(value)).split('.')
  const fraction = rawFraction
    .slice(0, maxFractionDigits)
    .replace(/0+$/, '')
    .padEnd(minFractionDigits, '0')
  const text = fraction ? `${whole}.${fraction}` : whole
  return unit ? `${text} ETH` : text
}

/**
 * Parses free-form user input ("0,5", " 1.20 ") into a canonical amount, or null
 * when it is not a valid non-negative decimal.
 */
export function parseEthInput(input: string): EthAmount | null {
  const normalized = input.trim().replace(',', '.')
  if (!ETH_PATTERN.test(normalized)) return null
  return fromWei(toWei(normalized))
}
