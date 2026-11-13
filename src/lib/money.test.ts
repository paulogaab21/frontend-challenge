import { describe, expect, test } from 'vitest'

import {
  addEth,
  compareEth,
  formatEth,
  fromWei,
  isEthAmount,
  isZeroEth,
  maxEth,
  minEth,
  mulEth,
  parseEthInput,
  percentOfEth,
  subEth,
  toWei,
} from './money'

describe('ETH parsing and display', () => {
  test.each([
    [' 1.20 ', '1.2'],
    ['0,5', '0.5'],
    ['00012.3400', '12.34'],
    ['0.000000000000000001', '0.000000000000000001'],
    ['000.000', '0'],
  ])('parses %j as %s', (input, expected) => {
    expect(parseEthInput(input)).toBe(expected)
  })

  test.each([
    '',
    ' ',
    '-1',
    '+1',
    '.5',
    '1.',
    '1e3',
    'NaN',
    'Infinity',
    '1,2,3',
    '1 000',
    '0.0000000000000000001',
  ])('rejects malformed input %j', (input) => {
    expect(parseEthInput(input)).toBeNull()
    expect(isEthAmount(input)).toBe(false)
    expect(() => toWei(input)).toThrow(TypeError)
  })

  test('transport amounts require strings and dot decimals without whitespace', () => {
    for (const input of [null, undefined, 1.2, {}, ' 1.2 ', '1,2']) {
      expect(isEthAmount(input)).toBe(false)
    }
    expect(isEthAmount('0001.200')).toBe(true)
  })

  test('preserves 18 digits and very large amounts exactly', () => {
    expect(toWei('1.123456789012345678')).toBe(1123456789012345678n)
    expect(fromWei(1n)).toBe('0.000000000000000001')
    expect(fromWei(toWei('9007199254740993.123456789012345678'))).toBe(
      '9007199254740993.123456789012345678',
    )
    expect(fromWei(1200000000000000000n)).toBe('1.2')
    expect(fromWei(0n)).toBe('0')
    expect(() => fromWei(-1n)).toThrow(RangeError)
  })

  test('formats display values without rounding their underlying amount', () => {
    expect(formatEth('2.5')).toBe('2.50 ETH')
    expect(formatEth('0.016')).toBe('0.016 ETH')
    expect(formatEth('26.846')).toBe('26.846 ETH')
    expect(formatEth('001.123456789')).toBe('1.123456 ETH')
    expect(formatEth('1.239', { minFractionDigits: 0, maxFractionDigits: 2, unit: false })).toBe(
      '1.23',
    )
    expect(formatEth('2', { minFractionDigits: 0, maxFractionDigits: 0 })).toBe('2 ETH')
    expect(
      formatEth('0.000000000000000001', {
        minFractionDigits: 0,
        maxFractionDigits: 18,
        unit: false,
      }),
    ).toBe('0.000000000000000001')
  })
})

describe('exact ETH arithmetic', () => {
  test('avoids binary float traps', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
    expect(mulEth('1.19', 9)).toBe('10.71')
    expect(addEth('26.83', '0.016')).toBe('26.846')
    expect(addEth('0.999999999999999999', '0.000000000000000001')).toBe('1')
    expect(addEth()).toBe('0')
  })

  test('clamps discounts at zero', () => {
    expect(subEth('1.19', '0.1')).toBe('1.09')
    expect(subEth('1', '1')).toBe('0')
    expect(subEth('0.01', '0.02')).toBe('0')
    expect(subEth('1', '0.999999999999999999')).toBe('0.000000000000000001')
  })

  test('multiplies integer quantities, including zero', () => {
    expect(mulEth('0.000000000000000001', 9)).toBe('0.000000000000000009')
    expect(mulEth('1.19', 0)).toBe('0')
    for (const quantity of [-1, 0.5, NaN, Infinity]) {
      expect(() => mulEth('1', quantity)).toThrow(RangeError)
    }
  })

  test('rounds basis-point percentages half up at the wei', () => {
    expect(percentOfEth('26.83', 1000)).toBe('2.683')
    expect(percentOfEth('0.000000000000000001', 4999)).toBe('0')
    expect(percentOfEth('0.000000000000000001', 5000)).toBe('0.000000000000000001')
    expect(percentOfEth('0.000000000000000003', 5000)).toBe('0.000000000000000002')
    expect(percentOfEth('1.19', 0)).toBe('0')
    expect(percentOfEth('1.19', 10_000)).toBe('1.19')
    for (const basisPoints of [-1, 0.5, NaN, Infinity]) {
      expect(() => percentOfEth('1', basisPoints)).toThrow(RangeError)
    }
  })

  test('compares at wei precision rather than lexicographically', () => {
    expect(compareEth('10', '2')).toBe(1)
    expect(compareEth('0.1', '0.10')).toBe(0)
    expect(compareEth('1', '1.000000000000000001')).toBe(-1)
    expect(minEth('10', '2')).toBe('2')
    expect(maxEth('10', '2')).toBe('10')
    expect(isZeroEth('000.000')).toBe(true)
    expect(isZeroEth('0.000000000000000001')).toBe(false)
    expect(() => addEth('1', '-1')).toThrow(TypeError)
  })
})
