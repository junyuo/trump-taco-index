import { indexConfig } from '../config/indexConfig'
import { getIndexStatus } from '../lib/tacoIndex'

interface PressureMeterProps {
  score: number
}

export function PressureMeter({ score }: PressureMeterProps) {
  const status = getIndexStatus(score)
  const markerPosition = Math.min(100, Math.max(0, score))

  return (
    <div
      className={`pressure-meter status-${status.tone}`}
      role="img"
      aria-label={`TACO 壓力指數 ${score} 分，狀態：${status.name}`}
    >
      <div className="pressure-track" aria-hidden="true">
        {indexConfig.statusBands.map((band) => (
          <span
            className={`pressure-band band-${band.tone}${band.tone === status.tone ? ' active' : ''}`}
            key={band.tone}
          />
        ))}
        <span
          className="pressure-marker"
          style={{ left: `${markerPosition}%` }}
        >
          <i />
        </span>
      </div>
      <div className="pressure-scale" aria-hidden="true">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>70</span>
        <span>85</span>
        <span>100</span>
      </div>
    </div>
  )
}
