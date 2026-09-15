import { describe, expect, it } from 'vitest'
import { getIndexStatus } from './tacoIndex'
import {
  getDailyPressureImpact,
  buildShareText,
  getHistoryCoverage,
  getHistoryContributions,
  getHistoryLeadingIndicatorKey,
  getHistoryScoreChange,
  getHistorySampleState,
  getHistoryStats,
  getObservationLagDays,
  getShortTermTrend,
  getThresholdDistance,
  isHistoryRangeAvailable,
} from './dashboardView'
import type { HistoryItem, LatestData } from '../types/data'

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

  it('derives aligned score changes and short-term trend without prediction claims', () => {
    const history = [
      historyItem('2026-09-01', 26),
      historyItem('2026-09-08', 23),
      historyItem('2026-09-09', 35),
    ]
    expect(getHistoryScoreChange(history, '2026-09-09')).toBe(12)
    expect(getHistoryScoreChange(history, '2026-09-01')).toBeNull()
    expect(getShortTermTrend(history)).toBe('rising')
    expect(getShortTermTrend(history.map((item, index) => ({ ...item, score: 40 - index * 4 })))).toBe('cooling')
  })

  it('reports only backward-fill lag relative to scoreAsOf', () => {
    expect(getObservationLagDays('2026-09-06', '2026-09-09')).toBe(3)
    expect(getObservationLagDays('2026-09-11', '2026-09-09')).toBe(0)
  })

  it('builds share copy from the current aligned index', () => {
    const baseIndicator = {
      label: 'Fixture',
      latestValue: 100,
      latestObservationDate: '2026-09-11',
      latestDailyChangePercent: 1,
      alignedValue: 99,
      alignedObservationDate: '2026-09-09',
      unit: 'points',
      zScore: 1,
      pressureZ: 1,
      weight: 0.25,
      contribution: 0.25,
      source: 'Source',
      sourceUrl: 'https://example.com/source',
      dataStatus: 'delayed' as const,
    }
    const latest: LatestData = {
      asOf: '2026-09-09T00:00:00Z',
      lastSuccessfulUpdate: '2026-09-12T00:00:00Z',
      dataMode: 'delayed',
      index: {
        score: 41,
        compositeZ: 1.36,
        status: '玉米餅開始加熱',
        scoreAsOf: '2026-09-09',
        previousScore: 35,
        scoreChange: 6,
      },
      indicators: {
        brent: { ...baseIndicator, label: 'Brent Crude', weight: 0.3, contribution: 0.68 },
        us10y: { ...baseIndicator, label: 'US 10Y Treasury', contribution: 0.5 },
        hormuz: { ...baseIndicator, label: 'Hormuz', contribution: 0 },
        sp500: { ...baseIndicator, label: 'S&P 500', weight: 0.2, contribution: 0 },
      },
    }

    const text = buildShareText(latest)
    expect(text).toContain('目前：41 / 100')
    expect(text).toContain('主要壓力：布蘭特原油、美國 10Y')
    expect(text).toContain('市場基準日：2026/09/09')
    expect(text).toContain('https://junyuo.github.io/trump-taco-index/')
  })
})
