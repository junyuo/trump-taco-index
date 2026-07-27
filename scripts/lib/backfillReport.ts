import { createHash } from 'node:crypto'
import type { HistoryItem } from '../../src/types/data'
import type { BackfillSeries } from './backfill'
import { findAsOfPoint } from './backfill'

const dayMilliseconds = 86_400_000
const maxGapDays = { brent: 7, us10y: 7, hormuz: 3, sp500: 0 } as const

export function serializeHistory(history: HistoryItem[]): string {
  return `${JSON.stringify(history, null, 2)}\n`
}

export function historySha256(history: HistoryItem[]): string {
  return createHash('sha256').update(serializeHistory(history)).digest('hex')
}

function gapDays(targetDate: string, sourceDate: string): number {
  return (
    Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${sourceDate}T00:00:00Z`)
  ) / dayMilliseconds
}

export function buildBackfillReport(
  series: BackfillSeries,
  history: HistoryItem[],
  generatedAt = new Date().toISOString(),
) {
  const scores = history.map((item) => item.score)
  const maximumAlignmentGaps = Object.fromEntries(
    (Object.keys(series) as (keyof BackfillSeries)[]).map((key) => {
      const gaps = history.map((item) => {
        const point = findAsOfPoint(series[key], item.date, maxGapDays[key])
        if (!point) throw new Error(`${key} 無法對齊 ${item.date}`)
        return gapDays(item.date, point.date)
      })
      return [key, Math.max(...gaps)]
    }),
  )

  return {
    generatedAt,
    candidateSha256: historySha256(history),
    pointCount: history.length,
    historyRange: {
      start: history[0].date,
      end: history.at(-1)!.date,
    },
    scoreRange: {
      minimum: Math.min(...scores),
      maximum: Math.max(...scores),
    },
    thresholdDays: {
      atOrAbove70: scores.filter((score) => score >= 70).length,
      atOrAbove85: scores.filter((score) => score >= 85).length,
    },
    sources: Object.fromEntries(
      (Object.keys(series) as (keyof BackfillSeries)[]).map((key) => [
        key,
        {
          pointCount: series[key].length,
          start: series[key][0].date,
          end: series[key].at(-1)!.date,
        },
      ]),
    ),
    maximumAlignmentGapDays: maximumAlignmentGaps,
    samples: [
      history[0],
      history[Math.floor(history.length / 2)],
      history.at(-1),
    ],
  }
}
