import { AlertTriangle, Database, FlaskConical } from 'lucide-react'
import type { IndicatorKey } from '../config/indexConfig'
import { indicatorPresentation } from '../lib/dashboardView'
import { formatDateTime } from '../lib/format'
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

  if (staleIndicators.length > 0) {
    const names = staleIndicators.map((key) => indicatorPresentation[key].shortLabel).join('、')
    return (
      <div className="data-banner stale-banner" role="status">
        <AlertTriangle aria-hidden="true" size={18} />
        <div>
          <strong>{names}更新延遲</strong>
          <span>畫面保留最後一份有效資料；最近成功抓取於 {formatDateTime(data.lastSuccessfulUpdate)}。</span>
        </div>
      </div>
    )
  }

  if (data.dataMode === 'delayed') {
    return (
      <div className="data-banner live-banner" role="status">
        <Database aria-hidden="true" size={18} />
        <div>
          <strong>四項來源狀態正常</strong>
          <span>日資料／延遲發布；最近成功抓取於 {formatDateTime(data.lastSuccessfulUpdate)}。</span>
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
