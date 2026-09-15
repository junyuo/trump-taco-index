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
  maxContribution: number
  scoreAsOf: string
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

export function IndicatorCard({ indicatorKey, indicator, stale, maxContribution, scoreAsOf }: Props) {
  const TrendIcon =
    indicator.latestDailyChangePercent > 0
      ? ArrowUpRight
      : indicator.latestDailyChangePercent < 0
        ? ArrowDownRight
        : Minus
  const StatusIcon = stale ? AlertTriangle : indicator.dataStatus === 'manual' ? Wrench : Radio
  const presentation = indicatorPresentation[indicatorKey]
  const dailyImpact =
    indicator.contribution === 0
      ? 'neutral'
      : getDailyPressureImpact(indicatorKey, indicator.latestDailyChangePercent)
  const contributionPercent =
    maxContribution > 0 ? Math.min(100, (indicator.contribution / maxContribution) * 100) : 0

  const sourceContent = (
    <>
      最新來源日期：{formatDate(indicator.latestObservationDate)}
      <br />
      指數採用：{formatNumber(indicator.alignedValue)}（{formatDate(indicator.alignedObservationDate)}）
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
        <strong>{formatNumber(indicator.latestValue)}</strong>
        <span>{indicator.unit}</span>
      </div>
      <div className="indicator-direction-row">
        <div className="daily-change" aria-label={`市場單日變動 ${formatPercent(indicator.latestDailyChangePercent)}`}>
          <TrendIcon aria-hidden="true" size={17} />
          {formatPercent(indicator.latestDailyChangePercent)} 市場變動
        </div>
        <span className={`pressure-impact ${dailyImpact}`}>{impactLabels[dailyImpact]}</span>
      </div>
      <div className="indicator-contribution-primary">
        <span>TACO 壓力貢獻</span>
        <strong>{indicator.contribution > 0 ? '+' : ''}{indicator.contribution.toFixed(2)}σ</strong>
        {indicator.pressureZ === 0 && <small>目前未增加 TACO 壓力</small>}
      </div>
      <dl className="indicator-metrics">
        <div>
          <dt>Z-score</dt>
          <dd>{indicator.zScore > 0 ? '+' : ''}{indicator.zScore.toFixed(2)}σ</dd>
        </div>
        <div>
          <dt>權重</dt>
          <dd>{Math.round(indicator.weight * 100)}%</dd>
        </div>
        <div>
          <dt>指數採用日</dt>
          <dd>{formatDate(indicator.alignedObservationDate)}</dd>
        </div>
      </dl>
      <div
        className="contribution-meter"
        aria-label={`相對壓力貢獻 ${Math.round(contributionPercent)}%`}
      >
        <span style={{ width: `${contributionPercent}%` }} />
      </div>
      {indicator.latestObservationDate > scoreAsOf && (
        <p className="indicator-alignment-note">
          較指數基準日更新，尚未納入本期 TACO Index。
        </p>
      )}
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
