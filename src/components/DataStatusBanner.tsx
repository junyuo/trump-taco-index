import { AlertTriangle, Database, FlaskConical } from 'lucide-react'
import type { LatestData } from '../types/data'

interface Props {
  data: LatestData
  stale: boolean
}

export function DataStatusBanner({ data, stale }: Props) {
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

  if (stale) {
    return (
      <div className="data-banner stale-banner" role="status">
        <AlertTriangle aria-hidden="true" size={18} />
        <div>
          <strong>資料更新延遲</strong>
          <span>畫面保留最後一份有效資料，請留意資料時間。</span>
        </div>
      </div>
    )
  }

  if (data.dataMode === 'delayed') {
    return (
      <div className="data-banner live-banner" role="status">
        <Database aria-hidden="true" size={18} />
        <div>
          <strong>真實延遲資料｜DELAYED DATA</strong>
          <span>四項來源均為日資料；請以各卡片的來源日期與發布狀態為準。</span>
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
