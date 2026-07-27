import { ArrowDownRight, ArrowUpRight, Minus, Radio, Wrench } from 'lucide-react'
import { formatNumber, formatPercent } from '../lib/format'
import type { LatestData } from '../types/data'

type Indicator = LatestData['indicators']['brent']

interface Props {
  indicator: Indicator
  accent: string
}

const statusLabels = {
  realtime: '即時資料',
  delayed: '延遲資料',
  manual: '人工維護／非即時資料',
  simulated: '模擬資料',
} as const

export function IndicatorCard({ indicator, accent }: Props) {
  const TrendIcon =
    indicator.dailyChangePercent > 0
      ? ArrowUpRight
      : indicator.dailyChangePercent < 0
        ? ArrowDownRight
        : Minus
  const StatusIcon = indicator.dataStatus === 'manual' ? Wrench : Radio

  return (
    <article className="indicator-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="indicator-topline">
        <span className="signal-dot" aria-hidden="true" />
        <span>{statusLabels[indicator.dataStatus]}</span>
      </div>
      <h3>{indicator.label}</h3>
      <div className="indicator-value-row">
        <strong>{formatNumber(indicator.value)}</strong>
        <span>{indicator.unit}</span>
      </div>
      <div
        className={`daily-change ${indicator.dailyChangePercent < 0 ? 'negative' : 'positive'}`}
        aria-label={`單日變動 ${formatPercent(indicator.dailyChangePercent)}`}
      >
        <TrendIcon aria-hidden="true" size={17} />
        {formatPercent(indicator.dailyChangePercent)} 今日
      </div>
      <dl className="indicator-metrics">
        <div>
          <dt>Z-score</dt>
          <dd>{indicator.zScore > 0 ? '+' : ''}{indicator.zScore.toFixed(2)}σ</dd>
        </div>
        <div>
          <dt>壓力 Z</dt>
          <dd>{indicator.pressureZ.toFixed(2)}σ</dd>
        </div>
        <div>
          <dt>權重</dt>
          <dd>{Math.round(indicator.weight * 100)}%</dd>
        </div>
        <div>
          <dt>加權貢獻</dt>
          <dd>{indicator.contribution.toFixed(2)}σ</dd>
        </div>
      </dl>
      <div className="indicator-source">
        <StatusIcon aria-hidden="true" size={15} />
        <span>來源：{indicator.source}</span>
      </div>
    </article>
  )
}
