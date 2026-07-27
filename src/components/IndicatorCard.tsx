import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, Radio, Wrench } from 'lucide-react'
import type { IndicatorKey } from '../config/indexConfig'
import { getDailyPressureImpact, indicatorPresentation } from '../lib/dashboardView'
import { formatDate, formatNumber, formatPercent } from '../lib/format'
import type { LatestData } from '../types/data'

type Indicator = LatestData['indicators']['brent']

interface Props {
  indicatorKey: IndicatorKey
  indicator: Indicator
  stale: boolean
}

const statusLabels = {
  realtime: '即時資料',
  delayed: '延遲資料',
  manual: '人工維護／非即時資料',
  simulated: '模擬資料',
} as const

const impactLabels = {
  increase: '今日壓力上升',
  ease: '今日壓力下降',
  neutral: '目前未增加壓力',
} as const

export function IndicatorCard({ indicatorKey, indicator, stale }: Props) {
  const TrendIcon =
    indicator.dailyChangePercent > 0
      ? ArrowUpRight
      : indicator.dailyChangePercent < 0
        ? ArrowDownRight
        : Minus
  const StatusIcon = stale ? AlertTriangle : indicator.dataStatus === 'manual' ? Wrench : Radio
  const presentation = indicatorPresentation[indicatorKey]
  const dailyImpact =
    indicator.contribution === 0
      ? 'neutral'
      : getDailyPressureImpact(indicatorKey, indicator.dailyChangePercent)

  const sourceContent = (
    <>
      來源日期：{formatDate(indicator.asOfDate)}
      <br />
      來源：
      {indicator.sourceUrl ? (
        <a href={indicator.sourceUrl} target="_blank" rel="noreferrer">
          {indicator.source}
        </a>
      ) : (
        indicator.source
      )}
    </>
  )

  return (
    <article className={`indicator-card ${presentation.className}${stale ? ' is-stale' : ''}`}>
      <div className="indicator-topline">
        <span className="signal-dot" aria-hidden="true" />
        <span>{stale ? '更新延遲' : statusLabels[indicator.dataStatus]}</span>
      </div>
      <h3>
        <span>{presentation.zhLabel}</span>
        <small>{indicator.label}</small>
      </h3>
      <div className="indicator-value-row">
        <strong>{formatNumber(indicator.value)}</strong>
        <span>{indicator.unit}</span>
      </div>
      <div className="indicator-direction-row">
        <div className="daily-change" aria-label={`市場單日變動 ${formatPercent(indicator.dailyChangePercent)}`}>
          <TrendIcon aria-hidden="true" size={17} />
          {formatPercent(indicator.dailyChangePercent)} 市場變動
        </div>
        <span className={`pressure-impact ${dailyImpact}`}>{impactLabels[dailyImpact]}</span>
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
      <div className="indicator-source indicator-source-desktop">
        <StatusIcon aria-hidden="true" size={15} />
        <span>{sourceContent}</span>
      </div>
      <details className="indicator-source indicator-source-mobile">
        <summary><StatusIcon aria-hidden="true" size={15} />查看資料來源與日期</summary>
        <div>{sourceContent}</div>
      </details>
    </article>
  )
}
