import { describe, expect, test } from 'claude-code/testing'

import { compact, crab, crabPosition, meter, minutes } from '../hooks/register'

describe('crab', () => {
  test('claws alternate and eyes follow the role', () => {
    expect(crab('scout', 0)).toBe('\\(o_o)/')
    expect(crab('scout', 1)).toBe('/(o_o)\\')
    expect(crab('captain', 0)).toBe('\\(O_O)/')
    expect(crab('unknown-role', 0)).toBe('\\(-_-)/')
  })

  test('walks the track and back without leaving it', () => {
    const width = 6
    const path = Array.from({ length: 14 }, (_, i) => crabPosition(i, width))
    expect(path).toEqual([0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0, 1])
    expect(Math.max(...path)).toBeLessThanOrEqual(width)
    expect(crabPosition(5, 0)).toBe(0)
  })
})

describe('cache readout', () => {
  test('meter fills in proportion and clamps', () => {
    expect(meter(0)).toBe('▱▱▱▱▱▱▱▱')
    expect(meter(0.5)).toBe('▰▰▰▰▱▱▱▱')
    expect(meter(1)).toBe('▰▰▰▰▰▰▰▰')
    expect(meter(7)).toBe('▰▰▰▰▰▰▰▰')
    expect(meter(-1)).toBe('▱▱▱▱▱▱▱▱')
  })

  test('token counts and idle times read short', () => {
    expect(compact(950)).toBe('950')
    expect(compact(41_200)).toBe('41k')
    expect(compact(2_500_000)).toBe('2.5m')
    expect(minutes(20_000)).toBe('<1m')
    expect(minutes(3 * 60_000)).toBe('3m')
    expect(minutes(95 * 60_000)).toBe('1h 35m')
    expect(minutes(120 * 60_000)).toBe('2h')
  })
})
