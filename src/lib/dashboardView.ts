import type { IndicatorKey } from '../config/indexConfig'
import type { HistoryItem, LatestData } from '../types/data'

export const indicatorPresentation: Record<
  IndicatorKey,
  { zhLabel: string; shortLabel: string; className: string }
> = {
  brent: { zhLabel: '布蘭特原油', shortLabel: '布蘭特原油', className: 'indicator-brent' },
  us10y: { zhLabel: '美國 10 年期公債殖利率', shortLabel: '美國 10Y', className: 'indicator-us10y' },
  hormuz: { zhLabel: '荷姆茲海峽每日通行艘次', shortLabel: '荷姆茲通行量', className: 'indicator-hormuz' },
  sp500: { zhLabel: '標普 500 指數', shortLabel: 'S&P 500', className: 'indicator-sp500' },
}

export type PressureImpact = 'increase' | 'ease' | 'neutral'

export function getDailyPressureImpact(
  key: IndicatorKey,
  dailyChangePercent: number,
): PressureImpact {
  if (dailyChangePercent === 0) return 'neutral'
  const inverted = key === 'hormuz' || key === 'sp500'
  const increasesPressure = inverted ? dailyChangePercent < 0 : dailyChangePercent > 0
  return increasesPressure ? 'increase' : 'ease'
}

export function getLeadingIndicatorKeys(
  indicators: LatestData['indicators'],
  limit = 2,
): IndicatorKey[] {
  return (Object.entries(indicators) as [IndicatorKey, LatestData['indicators']['brent']][])
    .sort(([, left], [, right]) => right.contribution - left.contribution)
    .slice(0, limit)
    .map(([key]) => key)
}

export function getThresholdDistance(score: number, threshold: 70 | 85): number {
  return Math.max(0, threshold - Math.round(score))
}

export interface HistoryCoverage {
  startDate: string | null
  endDate: string | null
  pointCount: number
  coverageDays: number
}

export function getHistoryCoverage(history: HistoryItem[]): HistoryCoverage {
  if (history.length === 0) {
    return { startDate: null, endDate: null, pointCount: 0, coverageDays: 0 }
  }

  const sortedDates = history.map((item) => item.date).sort()
  const startDate = sortedDates[0]
  const endDate = sortedDates.at(-1)!
  const coverageDays = Math.round(
    (new Date(`${endDate}T00:00:00Z`).getTime() -
      new Date(`${startDate}T00:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000),
  )

  return { startDate, endDate, pointCount: history.length, coverageDays }
}

export function isHistoryRangeAvailable(history: HistoryItem[], days: number): boolean {
  const coverage = getHistoryCoverage(history)
  return coverage.pointCount >= 2 && coverage.coverageDays >= Math.max(1, days - 7)
}
