import { ArrowRight, CalendarDays, ExternalLink, ShieldQuestion } from 'lucide-react'
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

export function EventTimeline({ events }: { events: TacoEvent[] }) {
  return (
    <section className="timeline-section" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THREAT → MARKET → PIVOT</span>
          <h2 id="timeline-title">TACO 事件時間軸</h2>
        </div>
        <span className="section-count">{events.length} 筆紀錄</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">尚無經驗證的歷史事件。</div>
      ) : (
        <div className="timeline-list">
          {events.map((event) => (
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
                <div className="event-sources">
                  {event.sources.length === 0 ? (
                    <span>示範資料，尚無已驗證來源</span>
                  ) : (
                    event.sources.map((source) => (
                      <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                        {source.publisher}：{source.title}
                        <ExternalLink aria-hidden="true" size={13} />
                      </a>
                    ))
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
