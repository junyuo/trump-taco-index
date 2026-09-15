import { useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Database,
  Minus,
  Share2,
  TrendingUp,
} from 'lucide-react'
import {
  buildShareText,
  getLeadingIndicatorKeys,
  getShortTermTrend,
  getThresholdDistance,
  indicatorPresentation,
} from '../lib/dashboardView'
import { formatObservationDate } from '../lib/format'
import { getIndexStatus } from '../lib/tacoIndex'
import type { HistoryItem, LatestData } from '../types/data'
import { PressureMeter } from './PressureMeter'

interface MarketPulseProps {
  latest: LatestData
  history: HistoryItem[]
  summary: string
}

const trendLabels = {
  rising: '市場壓力升溫',
  stable: '市場壓力持平',
  cooling: '市場壓力降溫',
} as const

function getThresholdLabel(score: number): string {
  if (score >= 85) return '已進入 TACO 時刻觀察區'
  if (score >= 70) return `距 TACO 時刻 ${getThresholdDistance(score, 85)} 分`
  return `距 TACO 警戒 ${getThresholdDistance(score, 70)} 分`
}

export function MarketPulse({ latest, history, summary }: MarketPulseProps) {
  const [shareStatus, setShareStatus] = useState('')
  const status = getIndexStatus(latest.index.score)
  const leadingLabels = getLeadingIndicatorKeys(latest.indicators)
    .map((key) => indicatorPresentation[key].shortLabel)
    .join('、') || '無明顯正向壓力'
  const trend = getShortTermTrend(history)
  const scoreChange = latest.index.scoreChange
  const ChangeIcon = scoreChange === null || scoreChange === 0
    ? Minus
    : scoreChange > 0
      ? ArrowUpRight
      : ArrowDownRight

  const handleShare = async () => {
    const text = buildShareText(latest)
    try {
      if (navigator.share) {
        await navigator.share({ text })
        setShareStatus('已開啟分享選單')
        return
      }
      await navigator.clipboard.writeText(text)
      setShareStatus('分享文字已複製')
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(text)
        setShareStatus('分享文字已複製')
      } catch {
        setShareStatus('無法自動分享，請複製目前網址')
      }
    }
  }

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
        <div className={`score-trend trend-${trend}`}>
          <ChangeIcon aria-hidden="true" size={19} />
          <strong>{scoreChange === null ? '—' : `${scoreChange > 0 ? '+' : ''}${scoreChange}`}</strong>
          <span>{scoreChange === null ? '尚無前期可比較' : `較前一市場觀測日 ${scoreChange > 0 ? '+' : ''}${scoreChange}`}</span>
          <em>{trendLabels[trend]}</em>
        </div>
        <PressureMeter score={latest.index.score} />
        <div className="pulse-metrics">
          <div>
            <span>主要壓力</span>
            <strong>{leadingLabels}</strong>
          </div>
          <div>
            <span>下一觀察門檻</span>
            <strong>{getThresholdLabel(latest.index.score)}</strong>
          </div>
          <div>
            <span>資料基準</span>
            <strong>{formatObservationDate(latest.index.scoreAsOf)}</strong>
          </div>
          <div className="metric-secondary">
            <span>綜合市場壓力</span>
            <strong>{latest.index.compositeZ.toFixed(2)}σ</strong>
          </div>
        </div>
      </div>

      <div className="pulse-brief">
        <div className="pulse-title">
          <span className="section-kicker">TRUMP TACO INDEX</span>
          <h1 id="market-pulse-title">川普政策退縮壓力指數</h1>
          <p>用四個市場變數，判讀強硬政策正在累積多少金融壓力。</p>
        </div>
        <div className="taco-explainer">
          <p>TACO 是 Trump Always Chickens Out 的市場俗稱，用來描述強硬政策造成市場壓力後，政策可能延後、縮小或轉向的現象。</p>
          <a href="#methodology">了解模型</a>
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
            <dt><Database aria-hidden="true" size={16} />TACO Index 基準日</dt>
            <dd>{formatObservationDate(latest.index.scoreAsOf)}</dd>
          </div>
        </dl>
        <button className="share-index" type="button" onClick={handleShare}>
          <Share2 aria-hidden="true" size={17} />分享目前指數
        </button>
        <span className="share-status" role="status" aria-live="polite">{shareStatus}</span>
      </div>
    </section>
  )
}
