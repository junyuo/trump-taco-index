import { describe, expect, it } from 'vitest'
import {
  buildBackfillHistory,
  buildLatestAlignedHistoryItem,
  findAsOfPoint,
} from './backfill'
import type { TimeSeriesPoint } from '../providers/types'

function dailySeries(length: number, offset = 0): TimeSeriesPoint[] {
  const start = Date.parse('2025-01-01T00:00:00Z')
  return Array.from({ length }, (_, index) => ({
    date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
    value: 100 + offset + Math.sin(index / 7) * 5 + index / 20,
  }))
}

describe('historical backfill', () => {
  it('只使用目標日當天或之前的值，並限制最大間隔', () => {
    const points = [
      { date: '2026-01-01', value: 1 },
      { date: '2026-01-05', value: 2 },
    ]
    expect(findAsOfPoint(points, '2026-01-04', 3)?.value).toBe(1)
    expect(findAsOfPoint(points, '2026-01-04', 2)).toBeUndefined()
  })

  it('建立排序且限於 0–100 的真實歷史格式', () => {
    const series = {
      brent: dailySeries(380),
      us10y: dailySeries(380, 20),
      hormuz: dailySeries(380, -20),
      sp500: dailySeries(380, 100),
    }
    const history = buildBackfillHistory(series, 252)
    expect(history).toHaveLength(252)
    expect(history[0].date < history.at(-1)!.date).toBe(true)
    expect(history.every((item) => item.score >= 0 && item.score <= 100)).toBe(true)
    expect(buildLatestAlignedHistoryItem(series)).toEqual(history.at(-1))
  })

  it('拒絕重複或亂序來源日期', () => {
    const points = dailySeries(380)
    const duplicate = [...points, points.at(-1)!]
    expect(() => buildBackfillHistory({
      brent: duplicate,
      us10y: points,
      hormuz: points,
      sp500: points,
    })).toThrow('嚴格遞增')
  })
})
