import { describe, expect, it } from 'vitest'
import type { HistoryItem } from '../src/types/data'
import { createNextHistory, hasNewObservationBatch } from './fetch-market-data'
import type { LatestData } from '../src/types/data'

const demoEntry: HistoryItem = {
  date: '2026-01-01',
  score: 40,
  compositeZ: 1.3,
  brentZ: 1,
  us10yZ: 1,
  hormuzZ: -1,
  sp500Z: -1,
}

describe('data update publication rules', () => {
  it('demo→live 首次發布會清除 demo 歷史', () => {
    const liveEntry = { ...demoEntry, date: '2026-07-27', score: 55 }
    expect(createNextHistory([demoEntry], 'demo', 'delayed', liveEntry)).toEqual([liveEntry])
  })

  it('同一來源模式只取代最新同日期，不重建全年歷史', () => {
    const replacement = { ...demoEntry, score: 60 }
    expect(createNextHistory([demoEntry], 'delayed', 'delayed', replacement)).toEqual([
      replacement,
    ])
  })

  it('相同來源日期與數值不視為新批次', () => {
    const indicator = {
      label: 'fixture',
      value: 1,
      unit: 'points',
      dailyChangePercent: 0,
      zScore: 0,
      pressureZ: 0,
      weight: 0.25,
      contribution: 0,
      source: 'fixture',
      asOfDate: '2026-07-27',
      dataStatus: 'delayed' as const,
    }
    const latest: LatestData = {
      asOf: '2026-07-27T00:00:00Z',
      lastSuccessfulUpdate: '2026-07-27T01:00:00Z',
      dataMode: 'delayed',
      index: { score: 0, compositeZ: 0, status: '還沒開火' },
      indicators: {
        brent: { ...indicator, weight: 0.3 },
        us10y: indicator,
        hormuz: indicator,
        sp500: { ...indicator, weight: 0.2 },
      },
    }
    expect(
      hasNewObservationBatch(latest, {
        ...latest,
        lastSuccessfulUpdate: '2026-07-27T07:00:00Z',
      }),
    ).toBe(false)
  })
})
