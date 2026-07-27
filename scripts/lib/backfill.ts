import { indexConfig } from '../../src/config/indexConfig'
import {
  calculateCompositeZ,
  calculateZScore,
  compositeZToScore,
} from '../../src/lib/tacoIndex'
import { historyDataSchema, type HistoryItem } from '../../src/types/data'
import type { TimeSeriesPoint } from '../providers/types'

const dayMilliseconds = 24 * 60 * 60 * 1_000

export interface BackfillSeries {
  brent: TimeSeriesPoint[]
  us10y: TimeSeriesPoint[]
  hormuz: TimeSeriesPoint[]
  sp500: TimeSeriesPoint[]
}

export function findAsOfPoint(
  points: TimeSeriesPoint[],
  targetDate: string,
  maxGapDays: number,
): TimeSeriesPoint | undefined {
  const match = [...points].reverse().find((point) => point.date <= targetDate)
  if (!match) return undefined
  const gap =
    (Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${match.date}T00:00:00Z`)) /
    dayMilliseconds
  return gap >= 0 && gap <= maxGapDays ? match : undefined
}

function calculateAsOfZ(
  points: TimeSeriesPoint[],
  targetDate: string,
  maxGapDays: number,
): number | undefined {
  const current = findAsOfPoint(points, targetDate, maxGapDays)
  if (!current) return undefined
  const history = points
    .filter((point) => point.date < current.date)
    .slice(-indexConfig.rollingWindow)
    .map((point) => point.value)
  if (history.length < indexConfig.rollingWindow) return undefined
  return calculateZScore({ currentValue: current.value, history })
}

export function buildBackfillHistory(
  series: BackfillSeries,
  targetCount = 252,
): HistoryItem[] {
  const entries: HistoryItem[] = []
  for (const spPoint of series.sp500) {
    const brentZ = calculateAsOfZ(series.brent, spPoint.date, 7)
    const us10yZ = calculateAsOfZ(series.us10y, spPoint.date, 7)
    const hormuzZ = calculateAsOfZ(series.hormuz, spPoint.date, 3)
    const sp500Z = calculateAsOfZ(series.sp500, spPoint.date, 0)
    if (
      brentZ === undefined ||
      us10yZ === undefined ||
      hormuzZ === undefined ||
      sp500Z === undefined
    ) {
      continue
    }
    const compositeZ = calculateCompositeZ({ brent: brentZ, us10y: us10yZ, hormuz: hormuzZ, sp500: sp500Z })
    entries.push({
      date: spPoint.date,
      score: compositeZToScore(compositeZ),
      compositeZ,
      brentZ,
      us10yZ,
      hormuzZ,
      sp500Z,
    })
  }

  if (entries.length < targetCount) {
    throw new Error(`可建立的真實歷史不足：需要 ${targetCount} 筆，實際 ${entries.length} 筆`)
  }
  return historyDataSchema.parse(entries.slice(-targetCount))
}
