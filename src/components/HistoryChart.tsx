import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate } from '../lib/format'
import type { HistoryItem, TacoEvent } from '../types/data'

const rangeOptions = [
  { label: '1 個月', days: 31 },
  { label: '3 個月', days: 92 },
  { label: '6 個月', days: 183 },
  { label: '1 年', days: 366 },
] as const

interface Props {
  history: HistoryItem[]
  events: TacoEvent[]
}

interface TooltipPayload {
  payload: HistoryItem
}

function ChartTooltip({
  active,
  payload,
  events,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  events: TacoEvent[]
}) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  const matchedEvents = events.filter(
    (event) => event.threatDate === item.date || event.pivotDate === item.date,
  )

  return (
    <div className="chart-tooltip">
      <strong>{formatDate(item.date)}</strong>
      <span>指數 {item.score}</span>
      <span>綜合壓力 {item.compositeZ.toFixed(2)}σ</span>
      {matchedEvents.map((event) => (
        <span className="tooltip-event" key={event.id}>事件：{event.title}</span>
      ))}
    </div>
  )
}

export function HistoryChart({ history, events }: Props) {
  const [rangeDays, setRangeDays] = useState(366)
  const filteredHistory = useMemo(() => {
    if (history.length === 0) return []
    const latestDate = new Date(`${history.at(-1)!.date}T00:00:00Z`).getTime()
    const cutoff = latestDate - rangeDays * 24 * 60 * 60 * 1000
    return history.filter((item) => new Date(`${item.date}T00:00:00Z`).getTime() >= cutoff)
  }, [history, rangeDays])

  return (
    <section className="panel chart-panel" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PRESSURE OVER TIME</span>
          <h2 id="history-title">歷史走勢</h2>
        </div>
        <div className="range-tabs" role="group" aria-label="歷史圖表時間範圍">
          {rangeOptions.map((option) => (
            <button
              type="button"
              className={rangeDays === option.days ? 'active' : ''}
              aria-pressed={rangeDays === option.days}
              onClick={() => setRangeDays(option.days)}
              key={option.days}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {filteredHistory.length === 0 ? (
        <div className="empty-state">尚無歷史資料可供繪圖。</div>
      ) : (
        <div className="chart-wrap" aria-label="TACO 指數歷史曲線圖">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory} margin={{ top: 18, right: 12, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ee8052" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="#ee8052" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#263038" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => date.slice(5).replace('-', '/')}
                stroke="#7f8b92"
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 70, 85, 100]} stroke="#7f8b92" tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip events={events} />} />
              <ReferenceLine y={70} stroke="#ee8052" strokeDasharray="5 5" label={{ value: '警戒 70', fill: '#ee8052', position: 'insideTopRight' }} />
              <ReferenceLine y={85} stroke="#a82f38" strokeDasharray="5 5" label={{ value: 'TACO 85', fill: '#ef6973', position: 'insideTopRight' }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#f0b651"
                strokeWidth={3}
                fill="url(#scoreGradient)"
                activeDot={{ r: 5, fill: '#f0b651', stroke: '#080b0e', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="chart-legend" aria-label="門檻說明">
        <span><i className="legend-line warning" />70 分 TACO 警戒</span>
        <span><i className="legend-line critical" />85 分 TACO 時刻</span>
      </div>
    </section>
  )
}
