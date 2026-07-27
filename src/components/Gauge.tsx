import { formatDateTime } from '../lib/format'
import { getIndexStatus } from '../lib/tacoIndex'

interface GaugeProps {
  score: number
  compositeZ: number
  asOf: string
  lastSuccessfulUpdate: string
}

export function Gauge({ score, compositeZ, asOf, lastSuccessfulUpdate }: GaugeProps) {
  const status = getIndexStatus(score)

  return (
    <div
      className={`gauge-shell status-${status.tone}`}
      role="group"
      aria-label={`TACO 壓力指數 ${score} 分，狀態：${status.name}，綜合市場壓力 ${compositeZ.toFixed(2)} 個標準差`}
      style={{ '--score': `${score * 3.6}deg` } as React.CSSProperties}
    >
      <div className="gauge-ring">
        <span className="gauge-marker" aria-hidden="true"><i /></span>
        <div className="gauge-center">
          <span className="gauge-kicker">TACO INDEX</span>
          <strong className="gauge-score">{score}</strong>
          <span className="gauge-status">
            <span aria-hidden="true">{status.icon}</span> {status.name}
          </span>
          <span className="gauge-z">{compositeZ.toFixed(2)}σ 綜合壓力</span>
        </div>
      </div>
      <dl className="gauge-times">
        <div>
          <dt>共同資料基準</dt>
          <dd>{formatDateTime(asOf)}</dd>
        </div>
        <div>
          <dt>最近成功抓取</dt>
          <dd>{formatDateTime(lastSuccessfulUpdate)}</dd>
        </div>
      </dl>
    </div>
  )
}
