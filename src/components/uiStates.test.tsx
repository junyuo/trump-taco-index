import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataStatusBanner } from './DataStatusBanner'
import { Gauge } from './Gauge'
import { IndicatorCard } from './IndicatorCard'
import type { LatestData } from '../types/data'

const indicator: LatestData['indicators']['brent'] = {
  label: 'Brent Crude',
  value: 86.99,
  unit: 'USD/barrel',
  dailyChangePercent: 2.33,
  zScore: -0.39,
  pressureZ: 0,
  weight: 0.3,
  contribution: 0,
  source: 'FRED',
  sourceUrl: 'https://fred.stlouisfed.org/',
  asOfDate: '2026-07-20',
  dataStatus: 'delayed',
}

const latest: LatestData = {
  asOf: '2026-07-19T00:00:00Z',
  lastSuccessfulUpdate: '2026-07-27T05:38:35Z',
  dataMode: 'delayed',
  index: { score: 22, compositeZ: 0.74, status: '還沒開火' },
  indicators: {
    brent: indicator,
    us10y: { ...indicator, label: 'US 10Y Treasury' },
    hormuz: { ...indicator, label: 'Strait of Hormuz Transit Calls' },
    sp500: { ...indicator, label: 'S&P 500' },
  },
}

describe('dashboard UI states', () => {
  it('labels the common data basis separately from the successful fetch time', () => {
    const html = renderToStaticMarkup(
      <Gauge
        score={22}
        compositeZ={0.74}
        asOf={latest.asOf}
        lastSuccessfulUpdate={latest.lastSuccessfulUpdate}
      />,
    )

    expect(html).toContain('共同資料基準')
    expect(html).toContain('最近成功抓取')
    expect(html).toContain('status-green')
  })

  it('shows stale status on an individual indicator card', () => {
    const html = renderToStaticMarkup(
      <IndicatorCard indicatorKey="brent" indicator={indicator} stale />,
    )

    expect(html).toContain('更新延遲')
    expect(html).toContain('布蘭特原油')
    expect(html).toContain('目前未增加壓力')
  })

  it('lists stale sources in the data health banner', () => {
    const html = renderToStaticMarkup(
      <DataStatusBanner data={latest} staleIndicators={['brent', 'hormuz']} />,
    )

    expect(html).toContain('布蘭特原油、荷姆茲通行量更新延遲')
  })
})
