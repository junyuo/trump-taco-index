import { AlertTriangle, Database, FlaskConical } from 'lucide-react'
import type { IndicatorKey } from '../config/indexConfig'
import { getObservationLagDays, indicatorPresentation } from '../lib/dashboardView'
import { formatDate, formatDateTime } from '../lib/format'
import type { LatestData } from '../types/data'

interface Props {
  data: LatestData
  staleIndicators: IndicatorKey[]
}

export function DataStatusBanner({ data, staleIndicators }: Props) {
  if (data.dataMode === 'demo') {
    return (
      <div className="data-banner demo-banner" role="status">
        <FlaskConical aria-hidden="true" size={18} />
        <div>
          <strong>DEMO MODE｜目前全站為示範資料</strong>
          <span>數值不是即時行情，不得用於交易或政策預測。</span>
        </div>
      </div>
    )
  }

  const sourceDates = (Object.keys(data.indicators) as IndicatorKey[])
    .map((key) => `${indicatorPresentation[key].shortLabel} ${formatDate(data.indicators[key].latestObservationDate)}`)
    .join('｜')
  const laggingSources = (Object.keys(data.indicators) as IndicatorKey[])
    .map((key) => ({
      key,
      days: getObservationLagDays(data.indicators[key].alignedObservationDate, data.index.scoreAsOf),
    }))
    .filter(({ days }) => days > 0)

  if (staleIndicators.length > 0) {
    const names = staleIndicators.map((key) => indicatorPresentation[key].shortLabel).join('、')
    return (
      <div className="data-banner stale-banner" role="status">
        <AlertTriangle aria-hidden="true" size={18} />
        <div>
          <strong>{names}更新延遲</strong>
          <span>TACO Index 基準日：{formatDate(data.index.scoreAsOf)}；畫面保留最後一份有效資料。</span>
          <span>最近成功抓取：{formatDateTime(data.lastSuccessfulUpdate)}</span>
        </div>
      </div>
    )
  }

  if (data.dataMode === 'delayed') {
    return (
      <div className="data-banner live-banner" role="status">
        <Database aria-hidden="true" size={18} />
        <div>
          <strong>TACO Index 基準日：{formatDate(data.index.scoreAsOf)}</strong>
          <span className="source-date-line">資料更新至：{sourceDates}</span>
          {laggingSources.map(({ key, days }) => (
            <span className="lag-note" key={key}>
              {indicatorPresentation[key].shortLabel}資料落後 {days} 日，目前指數沿用最近有效觀測。
            </span>
          ))}
          <span>最近成功抓取：{formatDateTime(data.lastSuccessfulUpdate)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="data-banner live-banner" role="status">
      <Database aria-hidden="true" size={18} />
      <div>
        <strong>資料來源已通過格式驗證</strong>
        <span>請仍以各資料來源的發布時間與授權條款為準。</span>
      </div>
    </div>
  )
}
