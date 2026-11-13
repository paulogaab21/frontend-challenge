import { fromWei, toWei } from '@/lib/money'
const CENT = 10n ** 16n
/** Slider values are integer hundredths; conversion never uses a float price. */
export function priceToStep(value: string, roundUp = false): number {
  const wei = toWei(value)
  const steps = (wei + (roundUp ? CENT - 1n : 0n)) / CENT
  if (steps > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('Price exceeds slider precision')
  return Number(steps)
}
export function stepToPrice(step: number): string {
  return fromWei(BigInt(step) * CENT)
}
