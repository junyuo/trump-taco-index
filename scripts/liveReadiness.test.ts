import { describe, expect, it } from 'vitest'
import type { LatestData } from '../src/types/data'
import { assertLiveReadiness } from './liveReadiness'

const now = new Date('2026-07-27T12:00:00Z')

function liveFixture(): LatestData {
  const indicator = {
    label: 'Market fixture',
    value: 100,
    unit: 'points',
    dailyChangePercent: 1,
    zScore: 1,
    pressureZ: 1,
    weight: 0.25,
    contribution: 0.25,
    source: 'Official source',
    sourceUrl: 'https://example.com/source',
    asOfDate: '2026-07-25',
    dataStatus: 'delayed' as const,
  }
  return {
    asOf: '2026-07-20T00:00:00Z',
    lastSuccessfulUpdate: now.toISOString(),
    dataMode: 'delayed',
    index: { score: 30, compositeZ: 1, status: '玉米餅開始加熱' },
    indicators: {
      brent: { ...indicator, weight: 0.3 },
      us10y: indicator,
      hormuz: {
        ...indicator,
        label: 'Strait of Hormuz Transit Calls',
        unit: 'vessels/day',
        asOfDate: '2026-07-20',
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
    staleMarket.indicators.sp500.asOfDate = '2026-07-22'
    expect(() => assertLiveReadiness(staleMarket, now)).toThrow('96')

    const staleBrent = liveFixture()
    staleBrent.indicators.brent.asOfDate = '2026-07-18'
    staleBrent.asOf = '2026-07-18T00:00:00Z'
    expect(() => assertLiveReadiness(staleBrent, now)).toThrow('192')

    const staleHormuz = liveFixture()
    staleHormuz.indicators.hormuz.asOfDate = '2026-07-16'
    staleHormuz.asOf = '2026-07-16T00:00:00Z'
    expect(() => assertLiveReadiness(staleHormuz, now)).toThrow('240')
  })

  it('拒絕 latest.asOf 與最舊來源日期不一致', () => {
    const fixture = liveFixture()
    fixture.asOf = '2026-07-25T00:00:00Z'
    expect(() => assertLiveReadiness(fixture, now)).toThrow('最舊')
  })
})
