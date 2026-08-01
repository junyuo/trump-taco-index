import { indexConfig, indicatorKeys, type IndicatorKey } from '../config/indexConfig'
import { toPressureZ } from './tacoIndex'
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

export const MIN_HISTORY_CHART_POINTS = 5
export const MIN_HISTORY_PERCENTILE_POINTS = 20
export const FULL_HISTORY_POINTS = 252

export type HistorySampleState =
  | 'empty'
  | 'building'
  | 'preliminary'
  | 'established'
  | 'full'

export function getHistorySampleState(pointCount: number): HistorySampleState {
  if (pointCount === 0) return 'empty'
  if (pointCount < MIN_HISTORY_CHART_POINTS) return 'building'
  if (pointCount < MIN_HISTORY_PERCENTILE_POINTS) return 'preliminary'
  if (pointCount < FULL_HISTORY_POINTS) return 'established'
  return 'full'
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
  if (days === 366 && coverage.pointCount >= FULL_HISTORY_POINTS) return true
  return (
    coverage.pointCount >= MIN_HISTORY_CHART_POINTS &&
    coverage.coverageDays >= Math.max(1, days - 7)
  )
}

export interface HistoryStats {
  maximumScore: number
  maximumDate: string
  averageScore: number
  periodChange: number
  warningDays: number
  criticalDays: number
  latestPercentile: number | null
}

export function getHistoryContributions(
  item: HistoryItem,
): Record<IndicatorKey, number> {
  const zScores: Record<IndicatorKey, number> = {
    brent: item.brentZ,
    us10y: item.us10yZ,
    hormuz: item.hormuzZ,
    sp500: item.sp500Z,
  }

  return Object.fromEntries(
    indicatorKeys.map((key) => [
      key,
      toPressureZ(key, zScores[key]) * indexConfig.weights[key],
    ]),
  ) as Record<IndicatorKey, number>
}

export function getHistoryLeadingIndicatorKey(
  item: HistoryItem,
): IndicatorKey | null {
  const contributions = getHistoryContributions(item)
  const leader = indicatorKeys.reduce((current, key) =>
    contributions[key] > contributions[current] ? key : current,
  )

  return contributions[leader] > 0 ? leader : null
}

export function getHistoryStats(history: HistoryItem[]): HistoryStats | null {
  if (history.length === 0) return null
  const scores = history.map((item) => item.score)
  const latestScore = scores.at(-1)!
  const maximum = history.reduce((current, item) =>
    item.score >= current.score ? item : current,
  )
  return {
    maximumScore: maximum.score,
    maximumDate: maximum.date,
    averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    periodChange: latestScore - scores[0],
    warningDays: scores.filter((score) => score >= 70).length,
    criticalDays: scores.filter((score) => score >= 85).length,
    latestPercentile:
      scores.length >= MIN_HISTORY_PERCENTILE_POINTS
        ? Math.round(
            (scores.filter((score) => score <= latestScore).length / scores.length) * 100,
          )
        : null,
  }
}
