import { describe, expect, it } from 'vitest'
import { buildHistoryObservationSummary } from './summary'
import type { HistoryItem } from '../types/data'

function historyItem(
  date: string,
  score: number,
  zScores: Partial<Pick<HistoryItem, 'brentZ' | 'us10yZ' | 'hormuzZ' | 'sp500Z'>> = {},
): HistoryItem {
  return {
    date,
    score,
    compositeZ: 1,
    brentZ: 0,
    us10yZ: 0,
    hormuzZ: 0,
    sp500Z: 0,
    ...zScores,
  }
}

describe('history observation summary', () => {
  it('describes period direction, maximum date, leading pressure, and thresholds', () => {
    const summary = buildHistoryObservationSummary([
      historyItem('2026-01-01', 20),
      historyItem('2026-01-02', 85, { hormuzZ: -3 }),
      historyItem('2026-01-03', 40),
    ])

    expect(summary).toContain('上升 20 分')
    expect(summary).toContain('2026年1月2日')
    expect(summary).toContain('荷姆茲通行量')
    expect(summary).toContain('1 日達到 70 分以上')
    expect(summary).toContain('1 日達到 85 分以上')
  })

  it('handles empty and single-point history without claiming a trend', () => {
    expect(buildHistoryObservationSummary([])).toBe('尚無歷史資料可供判讀。')
    expect(buildHistoryObservationSummary([
      historyItem('2026-01-01', 20),
    ])).toContain('尚不足以判斷趨勢')
  })
})
