import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataStatusBanner } from './DataStatusBanner'
import { IndicatorCard } from './IndicatorCard'
import { HistoryChart, HistoryChartTooltip } from './HistoryChart'
import { MarketPulse } from './MarketPulse'
import { PressureMeter } from './PressureMeter'
import { EventTimeline } from './EventTimeline'
import type { HistoryItem, LatestData } from '../types/data'

const indicator: LatestData['indicators']['brent'] = {
  label: 'Brent Crude',
  latestValue: 86.99,
  latestObservationDate: '2026-07-20',
  latestDailyChangePercent: 2.33,
  alignedValue: 85.5,
  alignedObservationDate: '2026-07-19',
  unit: 'USD/barrel',
  zScore: -0.39,
  pressureZ: 0,
  weight: 0.3,
  contribution: 0,
  source: 'FRED',
  sourceUrl: 'https://fred.stlouisfed.org/',
  dataStatus: 'delayed',
}

const latest: LatestData = {
  asOf: '2026-07-19T00:00:00Z',
  lastSuccessfulUpdate: '2026-07-27T05:38:35Z',
  dataMode: 'delayed',
  index: {
    score: 22,
    compositeZ: 0.74,
    status: '還沒開火',
    scoreAsOf: '2026-07-19',
    previousScore: 18,
    scoreChange: 4,
  },
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
      <MarketPulse latest={latest} history={[historyItem('2026-07-18', 18), historyItem('2026-07-19', 22)]} summary="目前市場壓力仍有限。" />,
    )

    expect(html).toContain('TACO Index 基準日')
    expect(html).toContain('2026年7月19日')
    expect(html).not.toContain('2026年7月19日 上午8:00')
    expect(html).toContain('status-green')
    expect(html).toContain('距 TACO 警戒 48 分')
    expect(html).toContain('較前一市場觀測日 +4')
    expect(html).toContain('分享目前指數')
  })

  it('does not draw or report a percentile for three history observations', () => {
    const history = [
      historyItem('2026-07-19', 20),
      historyItem('2026-07-20', 30),
      historyItem('2026-07-21', 40),
    ]
    const html = renderToStaticMarkup(<HistoryChart history={history} events={[]} />)

    expect(html).toContain('真實歷史累積中')
    expect(html).toContain('目前有 3 筆真實觀測')
    expect(html).toContain('全部')
    expect(html).not.toContain('最新歷史百分位')
    expect(html).not.toContain('chart-wrap')
  })

  it('renders all five pressure bands and the current score marker', () => {
    const html = renderToStaticMarkup(<PressureMeter score={72} />)

    expect(html).toContain('band-green')
    expect(html).toContain('band-yellow')
    expect(html).toContain('band-orange')
    expect(html).toContain('band-red active')
    expect(html).toContain('band-deep-red')
    expect(html).toContain('left:72%')
  })

  it('shows stale status on an individual indicator card', () => {
    const html = renderToStaticMarkup(
      <IndicatorCard
        indicatorKey="brent"
        indicator={indicator}
        stale
        maxContribution={0.5}
        scoreAsOf="2026-07-19"
      />,
    )

    expect(html).toContain('更新延遲')
    expect(html).toContain('布蘭特原油')
    expect(html).toContain('目前未增加壓力')
    expect(html).toContain('相對壓力貢獻 0%')
  })

  it('lists stale sources in the data health banner', () => {
    const html = renderToStaticMarkup(
      <DataStatusBanner data={latest} staleIndicators={['brent', 'hormuz']} />,
    )

    expect(html).toContain('布蘭特原油、荷姆茲通行量更新延遲')
    expect(html).toContain('TACO Index 基準日')
    expect(html).toContain('最近成功抓取')
  })

  it('separates score date, source dates, lag, and successful fetch time', () => {
    const data: LatestData = {
      ...latest,
      indicators: {
        ...latest.indicators,
        hormuz: {
          ...latest.indicators.hormuz,
          latestObservationDate: '2026-07-16',
          alignedObservationDate: '2026-07-16',
        },
      },
    }
    const html = renderToStaticMarkup(<DataStatusBanner data={data} staleIndicators={[]} />)

    expect(html).toContain('TACO Index 基準日')
    expect(html).toContain('資料更新至')
    expect(html).toContain('資料落後 3 日')
    expect(html).toContain('最近成功抓取')
  })

  it('shows the historical leading pressure source in the chart tooltip', () => {
    const historyItem: HistoryItem = {
      date: '2026-07-22',
      score: 78,
      compositeZ: 2.55,
      brentZ: 2.7,
      us10yZ: 1,
      hormuzZ: 0,
      sp500Z: 0,
    }
    const html = renderToStaticMarkup(
      <HistoryChartTooltip
        active
        payload={[{ payload: historyItem }]}
        events={[]}
        history={[{ ...historyItem, date: '2026-07-21', score: 69 }, historyItem]}
      />,
    )

    expect(html).toContain('TACO 警戒')
    expect(html).toContain('主要壓力：布蘭特原油')
    expect(html).toContain('變化 +9')
  })

  it('renders auditable event evidence without claiming causation', () => {
    const html = renderToStaticMarkup(
      <EventTimeline
        events={[
          {
            id: 'verified-event',
            threatDate: '2025-04-02',
            pivotDate: '2025-04-09',
            category: 'tariff',
            title: '已查證事件',
            threatSummary: '政策內容',
            pivotSummary: '調整內容',
            marketReaction: '市場變化',
            daysToPivot: 7,
            tacoClassification: 'likely',
            confidence: 'medium',
            lastReviewedAt: '2026-07-29',
            marketEvidence: {
              baselineDate: '2025-04-01',
              peakDate: '2025-04-08',
              baselineScore: 30,
              peakScore: 45,
              scoreChange: 15,
              leadingIndicators: ['sp500'],
            },
            criteria: {
              threatConfirmed: true,
              pivotConfirmed: true,
              marketStressObserved: true,
              timingAligned: true,
              contemporaneousLink: true,
            },
            sources: [
              {
                type: 'primary-policy',
                title: '官方文件',
                publisher: '官方',
                date: '2025-04-02',
                url: 'https://example.com/policy',
              },
              {
                type: 'market-data',
                title: '市場資料',
                publisher: '資料來源',
                date: '2025-04-08',
                url: 'https://example.com/market',
              },
              {
                type: 'reporting',
                title: '同期報導',
                publisher: '媒體',
                date: '2025-04-09',
                url: 'https://example.com/report',
              },
            ],
          },
        ]}
      />,
    )

    expect(html).toContain('時間關聯')
    expect(html).toContain('期間最高')
    expect(html).toContain('標普 500')
    expect(html).toContain('官方政策文件')
  })

  it('does not expose demo event details as verified production research', () => {
    const html = renderToStaticMarkup(
      <EventTimeline
        events={[{
          id: 'demo-event',
          threatDate: '2025-04-02',
          pivotDate: '2025-04-09',
          category: 'tariff',
          title: '示範事件不可顯示',
          threatSummary: 'Demo',
          pivotSummary: 'Demo',
          marketReaction: 'Demo',
          daysToPivot: 7,
          tacoClassification: 'possible',
          confidence: 'low',
          sources: [],
        }]}
      />,
    )

    expect(html).toContain('TACO 事件研究資料建置中')
    expect(html).not.toContain('示範事件不可顯示')
    expect(html).not.toContain('2025')
  })
})

function historyItem(date: string, score: number): HistoryItem {
  return {
    date,
    score,
    compositeZ: score / 30,
    brentZ: 0,
    us10yZ: 0,
    hormuzZ: 0,
    sp500Z: 0,
  }
}
