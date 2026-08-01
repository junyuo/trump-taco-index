import { describe, expect, it } from 'vitest'
import { getIndexStatus } from './tacoIndex'
import {
  getDailyPressureImpact,
  getHistoryCoverage,
  getHistoryContributions,
  getHistoryLeadingIndicatorKey,
  getHistorySampleState,
  getHistoryStats,
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

    const history = [
      historyItem('2026-06-01'),
      historyItem('2026-06-08'),
      historyItem('2026-06-15'),
      historyItem('2026-06-22'),
      historyItem('2026-07-01'),
    ]
    expect(getHistoryCoverage(history)).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-07-01',
      pointCount: 5,
      coverageDays: 30,
    })
    expect(isHistoryRangeAvailable(history, 31)).toBe(true)
    expect(isHistoryRangeAvailable(history, 92)).toBe(false)
  })

  it('summarizes history thresholds, average, and latest percentile', () => {
    const history = [
      historyItem('2026-01-01', 20),
      historyItem('2026-01-02', 70),
      historyItem('2026-01-03', 85),
      historyItem('2026-01-04', 40),
    ]
    expect(getHistoryStats(history)).toEqual({
      maximumScore: 85,
      maximumDate: '2026-01-03',
      averageScore: 53.75,
      periodChange: 20,
      warningDays: 2,
      criticalDays: 1,
      latestPercentile: null,
    })
    expect(getHistoryStats([])).toBeNull()
  })

  it('classifies honest history sample states at every display threshold', () => {
    expect([0, 1, 3, 5, 19, 20, 252].map(getHistorySampleState)).toEqual([
      'empty',
      'building',
      'building',
      'preliminary',
      'preliminary',
      'established',
      'full',
    ])
  })

  it('only calculates a percentile from at least 20 observations', () => {
    const history = Array.from({ length: 20 }, (_, index) =>
      historyItem(`2026-01-${String(index + 1).padStart(2, '0')}`, index + 1),
    )
    expect(getHistoryStats(history)?.latestPercentile).toBe(100)
    expect(getHistoryStats(history.slice(0, 19))?.latestPercentile).toBeNull()
  })

  it('uses the most recent date when the maximum score is tied', () => {
    const history = [
      historyItem('2026-01-01', 70),
      historyItem('2026-01-02', 20),
      historyItem('2026-01-03', 70),
    ]
    expect(getHistoryStats(history)?.maximumDate).toBe('2026-01-03')
  })

  it('derives historical contributions with the configured pressure directions', () => {
    const item = {
      ...historyItem('2026-01-01'),
      brentZ: 2,
      us10yZ: 1,
      hormuzZ: -2,
      sp500Z: -1,
    }
    expect(getHistoryContributions(item)).toEqual({
      brent: 0.6,
      us10y: 0.25,
      hormuz: 0.5,
      sp500: 0.2,
    })
    expect(getHistoryLeadingIndicatorKey(item)).toBe('brent')
    expect(getHistoryLeadingIndicatorKey(historyItem('2026-01-01'))).toBeNull()
  })

  it('treats 252 trading observations as one year', () => {
    const history = Array.from({ length: 252 }, (_, index) =>
      historyItem(new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10)),
    )
    expect(isHistoryRangeAvailable(history, 366)).toBe(true)
  })
})
