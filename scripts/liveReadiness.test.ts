import { describe, expect, it } from 'vitest'
import type { LatestData } from '../src/types/data'
import { assertLiveReadiness } from './liveReadiness'

const now = new Date('2026-07-27T12:00:00Z')

function liveFixture(): LatestData {
  const indicator = {
    label: 'Market fixture',
    latestValue: 100,
    latestObservationDate: '2026-07-25',
    latestDailyChangePercent: 1,
    alignedValue: 99,
    alignedObservationDate: '2026-07-25',
    unit: 'points',
    zScore: 1,
    pressureZ: 1,
    weight: 0.25,
    contribution: 0.25,
    source: 'Official source',
    sourceUrl: 'https://example.com/source',
    dataStatus: 'delayed' as const,
  }
  return {
    asOf: '2026-07-25T00:00:00Z',
    lastSuccessfulUpdate: now.toISOString(),
    dataMode: 'delayed',
    index: {
      score: 30,
      compositeZ: 1,
      status: '玉米餅開始加熱',
      scoreAsOf: '2026-07-25',
      previousScore: 24,
      scoreChange: 6,
    },
    indicators: {
      brent: { ...indicator, weight: 0.3 },
      us10y: indicator,
      hormuz: {
        ...indicator,
        label: 'Strait of Hormuz Transit Calls',
        unit: 'vessels/day',
        latestObservationDate: '2026-07-22',
        alignedObservationDate: '2026-07-22',
      },
      sp500: { ...indicator, weight: 0.2 },
    },
  }
}

describe('live readiness gate', () => {
  it('接受可追溯且未過期的 delayed batch', () => {
    expect(assertLiveReadiness(liveFixture(), now)).toBe(true)
  })

  it('拒絕缺少來源 URL、錯誤資料模式與 demo 標記', () => {
    const missingUrl = liveFixture()
    delete missingUrl.indicators.brent.sourceUrl
    expect(() => assertLiveReadiness(missingUrl, now)).toThrow('sourceUrl')

    const demo = liveFixture()
    demo.indicators.sp500.source = 'Demo data'
    expect(() => assertLiveReadiness(demo, now)).toThrow('demo')

    const wrongMode = liveFixture()
    wrongMode.dataMode = 'demo'
    expect(() => assertLiveReadiness(wrongMode, now)).toThrow('delayed')
  })

  it('依指標門檻拒絕 stale data', () => {
    const staleMarket = liveFixture()
    staleMarket.indicators.sp500.latestObservationDate = '2026-07-22'
    expect(() => assertLiveReadiness(staleMarket, now)).toThrow('96')

    const staleBrent = liveFixture()
    staleBrent.indicators.brent.latestObservationDate = '2026-07-18'
    expect(() => assertLiveReadiness(staleBrent, now)).toThrow('192')

    const staleHormuz = liveFixture()
    staleHormuz.indicators.hormuz.latestObservationDate = '2026-07-16'
    expect(() => assertLiveReadiness(staleHormuz, now)).toThrow('240')
  })

  it('拒絕 latest.asOf 與 scoreAsOf 不一致', () => {
    const fixture = liveFixture()
    fixture.asOf = '2026-07-24T00:00:00Z'
    expect(() => assertLiveReadiness(fixture, now)).toThrow('scoreAsOf')
  })

  it('拒絕使用 scoreAsOf 之後的 aligned observation', () => {
    const fixture = liveFixture()
    fixture.indicators.us10y.alignedObservationDate = '2026-07-26'
    expect(() => assertLiveReadiness(fixture, now)).toThrow('不可晚於')
  })
})
