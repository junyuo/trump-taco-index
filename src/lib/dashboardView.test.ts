import { describe, expect, it } from 'vitest'
import { getIndexStatus } from './tacoIndex'
import {
  getDailyPressureImpact,
  getHistoryCoverage,
  getThresholdDistance,
  isHistoryRangeAvailable,
} from './dashboardView'
import type { HistoryItem } from '../types/data'

function historyItem(date: string, score = 20): HistoryItem {
  return {
    date,
    score,
    compositeZ: 0.6,
    brentZ: 0,
    us10yZ: 0,
    hormuzZ: 0,
    sp500Z: 0,
  }
}

describe('dashboard view helpers', () => {
  it('maps raw daily moves to the correct TACO pressure direction', () => {
    expect(getDailyPressureImpact('brent', 1)).toBe('increase')
    expect(getDailyPressureImpact('us10y', -1)).toBe('ease')
    expect(getDailyPressureImpact('hormuz', -1)).toBe('increase')
    expect(getDailyPressureImpact('sp500', 1)).toBe('ease')
    expect(getDailyPressureImpact('sp500', 0)).toBe('neutral')
  })

  it('maps all five score bands to distinct status tones', () => {
    expect([0, 25, 50, 70, 85].map((score) => getIndexStatus(score).tone)).toEqual([
      'green',
      'yellow',
      'orange',
      'red',
      'deep-red',
    ])
  })

  it('calculates distances to the warning thresholds without going negative', () => {
    expect(getThresholdDistance(22, 70)).toBe(48)
    expect(getThresholdDistance(90, 85)).toBe(0)
  })

  it('handles empty, single-point, and sufficient history coverage', () => {
    expect(getHistoryCoverage([]).pointCount).toBe(0)
    expect(isHistoryRangeAvailable([historyItem('2026-07-19')], 31)).toBe(false)

    const history = [historyItem('2026-06-01'), historyItem('2026-07-01')]
    expect(getHistoryCoverage(history)).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-07-01',
      pointCount: 2,
      coverageDays: 30,
    })
    expect(isHistoryRangeAvailable(history, 31)).toBe(true)
    expect(isHistoryRangeAvailable(history, 92)).toBe(false)
  })
})
