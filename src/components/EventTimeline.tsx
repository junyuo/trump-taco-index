import {
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  FlaskConical,
  ShieldQuestion,
  X,
} from 'lucide-react'
import { formatDate } from '../lib/format'
import type { TacoEvent } from '../types/data'

const classificationLabels = {
  likely: '較符合 TACO',
  possible: '可能符合',
  unlikely: '不太符合',
  pending: '待觀察',
} as const

const confidenceLabels = {
  high: '高信心',
  medium: '中信心',
  low: '低信心',
} as const

const sourceTypeLabels = {
  'primary-policy': '官方政策文件',
  'market-data': '市場資料',
  reporting: '同期報導',
} as const

const indicatorLabels = {
  brent: '布蘭特原油',
  us10y: '美國 10 年期殖利率',
  hormuz: '荷姆茲通行量',
  sp500: '標普 500',
} as const

const criteriaLabels = {
  threatConfirmed: '強硬政策已由一手來源確認',
  pivotConfirmed: '政策調整已由一手來源確認',
  marketStressObserved: '觀察期間出現符合門檻的市場壓力',
  timingAligned: '政策調整發生於 45 日觀察窗內',
  contemporaneousLink: '同期獨立來源提及市場或經濟壓力',
} as const

function EventEvidence({ event }: { event: TacoEvent }) {
  if (!event.marketEvidence || !event.criteria) return null
  const evidence = event.marketEvidence

  return (
    <div className="event-evidence">
      <div className="evidence-summary">
        <div><span>基準分數</span><strong>{evidence.baselineScore}</strong></div>
        <div><span>期間最高</span><strong>{evidence.peakScore}</strong></div>
        <div><span>分數變化</span><strong>{evidence.scoreChange > 0 ? '+' : ''}{evidence.scoreChange}</strong></div>
        <div>
          <span>主要壓力</span>
          <strong>
            {evidence.leadingIndicators.length > 0
              ? evidence.leadingIndicators.map((key) => indicatorLabels[key]).join('、')
              : '無明顯來源'}
          </strong>
        </div>
      </div>
      <p className="evidence-window">
        市場觀察窗：{formatDate(evidence.baselineDate)}至 {formatDate(evidence.peakDate)}
      </p>
      <ul className="criteria-list" aria-label="TACO 判定條件">
        {Object.entries(event.criteria).map(([key, passed]) => (
          <li className={passed ? 'passed' : 'not-passed'} key={key}>
            {passed ? <Check aria-hidden="true" size={15} /> : <X aria-hidden="true" size={15} />}
            {criteriaLabels[key as keyof typeof criteriaLabels]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EventSources({ event }: { event: TacoEvent }) {
  if (event.sources.length === 0) {
    return <span>示範資料，尚無已驗證來源</span>
  }

  return (
    <>
      {(Object.keys(sourceTypeLabels) as (keyof typeof sourceTypeLabels)[]).map((type) => {
        const sources = event.sources.filter(
          (source) => (source.type ?? 'reporting') === type,
        )
        if (sources.length === 0) return null
        return (
          <div className="source-group" key={type}>
            <strong>{sourceTypeLabels[type]}</strong>
            {sources.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                {source.publisher}：{source.title}
                <ExternalLink aria-hidden="true" size={13} />
              </a>
            ))}
          </div>
        )
      })}
    </>
  )
}

export function EventTimeline({ events }: { events: TacoEvent[] }) {
  const isDemoResearch = events.length > 0 && events.every((event) => event.sources.length === 0)
  const orderedEvents = [...events].sort((left, right) =>
    right.threatDate.localeCompare(left.threatDate),
  )

  return (
    <section className={`timeline-section${isDemoResearch ? ' demo-research' : ''}`} aria-labelledby="timeline-title">
      <details open={!isDemoResearch}>
        <summary className="section-heading">
          <div>
            <span className="eyebrow">THREAT → MARKET → PIVOT</span>
            <h2 id="timeline-title">{isDemoResearch ? '事件研究區' : 'TACO 事件時間軸'}</h2>
          </div>
          {isDemoResearch ? (
            <span className="demo-research-badge"><FlaskConical aria-hidden="true" size={14} />DEMO／尚未完成來源查證</span>
          ) : (
            <span className="section-count">{events.length} 筆已查證研究</span>
          )}
        </summary>
        <div className="timeline-body">
          {isDemoResearch && (
            <p className="research-note">
              此區內容僅示範事件資料結構，不是已驗證的政策或市場紀錄。
            </p>
          )}
          {!isDemoResearch && events.length > 0 && (
            <p className="research-causality-note">
              事件研究呈現政策與市場壓力的時間關聯，不代表已證明政策調整由市場壓力造成。
            </p>
          )}
          {events.length === 0 ? (
            <div className="empty-state">尚無經驗證的歷史事件。</div>
          ) : (
            <div className="timeline-list">
              {orderedEvents.map((event) => (
            <article className="timeline-item" key={event.id}>
              <div className="timeline-marker" aria-hidden="true">
                <span>{event.daysToPivot ?? '—'}</span>
                <small>天</small>
              </div>
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span className={`classification ${event.tacoClassification}`}>
                    <ShieldQuestion aria-hidden="true" size={14} />
                    {classificationLabels[event.tacoClassification]}
                  </span>
                  <span>{confidenceLabels[event.confidence]}</span>
                  <span>{event.category.toUpperCase()}</span>
                </div>
                <h3>{event.title}</h3>
                {event.lastReviewedAt && (
                  <p className="event-reviewed">最後審閱：{formatDate(event.lastReviewedAt)}</p>
                )}
                <div className="event-flow">
                  <div>
                    <span className="flow-label">強硬政策／威脅</span>
                    <strong><CalendarDays aria-hidden="true" size={15} /> {formatDate(event.threatDate)}</strong>
                    <p>{event.threatSummary}</p>
                  </div>
                  <ArrowRight className="flow-arrow" aria-hidden="true" />
                  <div>
                    <span className="flow-label">延後／弱化／轉向</span>
                    <strong><CalendarDays aria-hidden="true" size={15} /> {event.pivotDate ? formatDate(event.pivotDate) : '尚待觀察'}</strong>
                    <p>{event.pivotSummary}</p>
                  </div>
                </div>
                <div className="market-reaction">
                  <strong>市場反應</strong>
                  <p>{event.marketReaction}</p>
                </div>
                <EventEvidence event={event} />
                <div className="event-sources">
                  <EventSources event={event} />
                </div>
              </div>
            </article>
              ))}
            </div>
          )}
        </div>
      </details>
    </section>
  )
}
