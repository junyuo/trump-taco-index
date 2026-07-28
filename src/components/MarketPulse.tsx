import { Activity, Clock3, Database, TrendingUp } from 'lucide-react'
import {
  getLeadingIndicatorKeys,
  getThresholdDistance,
  indicatorPresentation,
} from '../lib/dashboardView'
import { formatDateTime } from '../lib/format'
import { getIndexStatus } from '../lib/tacoIndex'
import type { LatestData } from '../types/data'
import { PressureMeter } from './PressureMeter'

interface MarketPulseProps {
  latest: LatestData
  summary: string
}

function getThresholdLabel(score: number): string {
  if (score >= 85) return '已進入 TACO 時刻觀察區'
  if (score >= 70) return `距 TACO 時刻 ${getThresholdDistance(score, 85)} 分`
  return `距 70 分警戒 ${getThresholdDistance(score, 70)} 分`
}

export function MarketPulse({ latest, summary }: MarketPulseProps) {
  const status = getIndexStatus(latest.index.score)
  const leadingLabels = getLeadingIndicatorKeys(latest.indicators)
    .map((key) => indicatorPresentation[key].shortLabel)
    .join('、')

  return (
    <section
      className={`market-pulse status-${status.tone}`}
      id="dashboard"
      aria-labelledby="market-pulse-title"
    >
      <div className="pulse-score-column">
        <div className="pulse-heading">
          <span className="section-kicker"><Activity aria-hidden="true" size={16} /> 市場脈搏</span>
          <span className="pulse-mode">TACO INDEX</span>
        </div>
        <div className="pulse-score-row">
          <strong className="pulse-score">{latest.index.score}</strong>
          <div>
            <span className="pulse-score-unit">／100</span>
            <span className="pulse-status"><span aria-hidden="true">{status.icon}</span>{status.name}</span>
          </div>
        </div>
        <PressureMeter score={latest.index.score} />
        <div className="pulse-metrics">
          <div>
            <span>綜合市場壓力</span>
            <strong>{latest.index.compositeZ.toFixed(2)}σ</strong>
          </div>
          <div>
            <span>下一觀察門檻</span>
            <strong>{getThresholdLabel(latest.index.score)}</strong>
          </div>
        </div>
      </div>

      <div className="pulse-brief">
        <div className="pulse-title">
          <span className="section-kicker">TRUMP TACO INDEX</span>
          <h1 id="market-pulse-title">川普政策退縮壓力指數</h1>
          <p>用四個市場變數，判讀強硬政策正在累積多少金融壓力。</p>
        </div>
        <div className="brief-card">
          <span className="brief-label">今日觀察</span>
          <p>{summary}</p>
          <span className="rules-badge">規則式摘要</span>
        </div>
        <dl className="pulse-facts">
          <div>
            <dt><TrendingUp aria-hidden="true" size={16} />主要壓力來源</dt>
            <dd>{leadingLabels}</dd>
          </div>
          <div>
            <dt><Database aria-hidden="true" size={16} />共同資料基準</dt>
            <dd>{formatDateTime(latest.asOf)}</dd>
          </div>
          <div>
            <dt><Clock3 aria-hidden="true" size={16} />最近成功抓取</dt>
            <dd>{formatDateTime(latest.lastSuccessfulUpdate)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
