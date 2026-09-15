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

export interface AlignedIndexSnapshot {
  item: HistoryItem
  previousItem: HistoryItem | null
  observations: Record<keyof BackfillSeries, TimeSeriesPoint>
}

function validateSeries(points: TimeSeriesPoint[], key: keyof BackfillSeries): void {
  if (points.length === 0) throw new Error(`${key} 歷史序列不得為空`)
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (!Number.isFinite(point.value)) throw new Error(`${key} 包含非有限數值`)
    if (index > 0 && points[index - 1].date >= point.date) {
      throw new Error(`${key} 日期必須嚴格遞增且不得重複`)
    }
  }
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

function buildAlignedEntry(
  series: BackfillSeries,
  targetDate: string,
): { item: HistoryItem; observations: AlignedIndexSnapshot['observations'] } | undefined {
  const observations = {
    brent: findAsOfPoint(series.brent, targetDate, indexConfig.alignmentMaxGapDays.brent),
    us10y: findAsOfPoint(series.us10y, targetDate, indexConfig.alignmentMaxGapDays.us10y),
    hormuz: findAsOfPoint(series.hormuz, targetDate, indexConfig.alignmentMaxGapDays.hormuz),
    sp500: findAsOfPoint(series.sp500, targetDate, indexConfig.alignmentMaxGapDays.sp500),
  }
  if (!observations.brent || !observations.us10y || !observations.hormuz || !observations.sp500) {
    return undefined
  }

  const brentZ = calculateAsOfZ(series.brent, targetDate, indexConfig.alignmentMaxGapDays.brent)
  const us10yZ = calculateAsOfZ(series.us10y, targetDate, indexConfig.alignmentMaxGapDays.us10y)
  const hormuzZ = calculateAsOfZ(series.hormuz, targetDate, indexConfig.alignmentMaxGapDays.hormuz)
  const sp500Z = calculateAsOfZ(series.sp500, targetDate, indexConfig.alignmentMaxGapDays.sp500)
  if (
    brentZ === undefined ||
    us10yZ === undefined ||
    hormuzZ === undefined ||
    sp500Z === undefined
  ) {
    return undefined
  }

  const compositeZ = calculateCompositeZ({ brent: brentZ, us10y: us10yZ, hormuz: hormuzZ, sp500: sp500Z })
  return {
    observations: observations as AlignedIndexSnapshot['observations'],
    item: {
      date: targetDate,
      score: compositeZToScore(compositeZ),
      compositeZ,
      brentZ,
      us10yZ,
      hormuzZ,
      sp500Z,
    },
  }
}

export function buildBackfillHistory(
  series: BackfillSeries,
  targetCount = 252,
): HistoryItem[] {
  for (const key of Object.keys(series) as (keyof BackfillSeries)[]) {
    validateSeries(series[key], key)
  }
  const entries: HistoryItem[] = []
  for (const spPoint of series.sp500) {
    const aligned = buildAlignedEntry(series, spPoint.date)
    if (aligned) entries.push(aligned.item)
  }

  if (entries.length < targetCount) {
    throw new Error(`可建立的真實歷史不足：需要 ${targetCount} 筆，實際 ${entries.length} 筆`)
  }
  return historyDataSchema.parse(entries.slice(-targetCount))
}

export function buildLatestAlignedHistoryItem(series: BackfillSeries): HistoryItem {
  return buildLatestAlignedIndex(series).item
}

export function buildLatestAlignedIndex(series: BackfillSeries): AlignedIndexSnapshot {
  for (const key of Object.keys(series) as (keyof BackfillSeries)[]) {
    validateSeries(series[key], key)
  }

  const alignedEntries = [...series.sp500]
    .reverse()
    .map((point) => buildAlignedEntry(series, point.date))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .slice(0, 2)

  if (alignedEntries.length === 0) {
    throw new Error('找不到符合日期間隔與 60 筆 rolling window 的最新對齊資料')
  }

  return {
    item: alignedEntries[0].item,
    previousItem: alignedEntries[1]?.item ?? null,
    observations: alignedEntries[0].observations,
  }
}
