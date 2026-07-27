import { describe, expect, it } from 'vitest'
import type { TimeSeriesPoint } from '../providers/types'
import { buildBackfillHistory } from './backfill'
import {
  buildBackfillReport,
  historySha256,
  serializeHistory,
} from './backfillReport'

function series(length: number, offset: number): TimeSeriesPoint[] {
  const start = Date.parse('2025-01-01T00:00:00Z')
  return Array.from({ length }, (_, index) => ({
    date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
    value: offset + index / 10 + Math.sin(index / 8),
  }))
}

describe('backfill audit report', () => {
  it('produces a deterministic candidate hash and auditable summary', () => {
    const sources = {
      brent: series(380, 80),
      us10y: series(380, 4),
      hormuz: series(380, 20),
      sp500: series(380, 6000),
    }
    const history = buildBackfillHistory(sources)
    const first = buildBackfillReport(sources, history, '2026-01-01T00:00:00Z')
    const second = buildBackfillReport(sources, history, '2026-01-02T00:00:00Z')

    expect(history).toHaveLength(252)
    expect(first.candidateSha256).toBe(second.candidateSha256)
    expect(first.candidateSha256).toBe(historySha256(history))
    expect(first.samples).toHaveLength(3)
    expect(first.pointCount).toBe(252)
    expect(serializeHistory(history).endsWith('\n')).toBe(true)
  })
})
