import { formatDateTime } from '../lib/format'
import { getIndexStatus } from '../lib/tacoIndex'

interface GaugeProps {
  score: number
  compositeZ: number
  asOf: string
}

export function Gauge({ score, compositeZ, asOf }: GaugeProps) {
  const status = getIndexStatus(score)

  return (
    <div
      className="gauge-shell"
      role="img"
      aria-label={`TACO 壓力指數 ${score} 分，狀態：${status.name}，綜合市場壓力 ${compositeZ.toFixed(2)} 個標準差`}
      style={{ '--score': `${score * 3.6}deg` } as React.CSSProperties}
    >
      <div className="gauge-ring">
        <div className="gauge-center">
          <span className="gauge-kicker">TACO INDEX</span>
          <strong className="gauge-score">{score}</strong>
          <span className="gauge-status">
            <span aria-hidden="true">{status.icon}</span> {status.name}
          </span>
          <span className="gauge-z">{compositeZ.toFixed(2)}σ 綜合壓力</span>
        </div>
      </div>
      <div className="gauge-time">更新於 {formatDateTime(asOf)}</div>
    </div>
  )
}
