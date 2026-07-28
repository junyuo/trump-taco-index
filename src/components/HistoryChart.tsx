import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getHistoryCoverage,
  getHistoryLeadingIndicatorKey,
  getHistoryStats,
  indicatorPresentation,
  isHistoryRangeAvailable,
} from '../lib/dashboardView'
import { formatDate } from '../lib/format'
import { buildHistoryObservationSummary } from '../lib/summary'
import { getIndexStatus } from '../lib/tacoIndex'
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

export function HistoryChartTooltip({
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
  const status = getIndexStatus(item.score)
  const leadingKey = getHistoryLeadingIndicatorKey(item)
  const matchedEvents = events.filter(
    (event) =>
      event.sources.length > 0 &&
      (event.threatDate === item.date || event.pivotDate === item.date),
  )

  return (
    <div className="chart-tooltip">
      <strong>{formatDate(item.date)}</strong>
      <span>指數 {item.score}</span>
      <span>{status.icon} {status.name}</span>
      <span>綜合壓力 {item.compositeZ.toFixed(2)}σ</span>
      <span>
        主要壓力：{leadingKey ? indicatorPresentation[leadingKey].shortLabel : '無正向壓力'}
      </span>
      {matchedEvents.map((event) => (
        <span className="tooltip-event" key={event.id}>事件：{event.title}</span>
      ))}
    </div>
  )
}

export function HistoryChart({ history, events }: Props) {
  const [rangeDays, setRangeDays] = useState(
    () => [...rangeOptions].reverse().find((option) => isHistoryRangeAvailable(history, option.days))?.days ?? 31,
  )
  const coverage = getHistoryCoverage(history)
  const filteredHistory = useMemo(() => {
    if (history.length === 0) return []
    const latestDate = new Date(`${history.at(-1)!.date}T00:00:00Z`).getTime()
    const cutoff = latestDate - rangeDays * 24 * 60 * 60 * 1000
    return history.filter((item) => new Date(`${item.date}T00:00:00Z`).getTime() >= cutoff)
  }, [history, rangeDays])
  const latest = history.at(-1)
  const latestStatus = latest ? getIndexStatus(latest.score) : null
  const stats = getHistoryStats(filteredHistory)
  const periodLatest = filteredHistory.at(-1)
  const maximum = stats
    ? filteredHistory.find((item) => item.date === stats.maximumDate)
    : undefined
  const historySummary = buildHistoryObservationSummary(filteredHistory)

  return (
    <section className="panel chart-panel" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PRESSURE OVER TIME</span>
          <h2 id="history-title">歷史走勢</h2>
        </div>
        <span className="history-coverage">
          {coverage.pointCount > 0 && coverage.startDate && coverage.endDate
            ? `${formatDate(coverage.startDate)}－${formatDate(coverage.endDate)}｜${coverage.pointCount} 筆`
            : '尚無資料'}
        </span>
        <div className="range-tabs" role="group" aria-label="歷史圖表時間範圍">
          {rangeOptions.map((option) => {
            const available = isHistoryRangeAvailable(history, option.days)
            return (
              <button
                type="button"
                className={rangeDays === option.days ? 'active' : ''}
                aria-pressed={rangeDays === option.days}
                disabled={!available}
                title={available ? undefined : `尚未累積足夠的${option.label}資料`}
                onClick={() => setRangeDays(option.days)}
                key={option.days}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      {history.length === 0 ? (
        <div className="empty-state">尚無歷史資料可供繪圖。</div>
      ) : history.length < 2 && latest && latestStatus ? (
        <div className="history-building" role="status">
          <span>真實歷史累積中</span>
          <strong>{latest.score}</strong>
          <p>{latestStatus.icon} {latestStatus.name}｜{formatDate(latest.date)}｜綜合壓力 {latest.compositeZ.toFixed(2)}σ</p>
          <small>目前僅有首次真實觀測；累積至少兩筆後開始繪製趨勢線。</small>
        </div>
      ) : filteredHistory.length < 2 ? (
        <div className="empty-state">此範圍內尚無足夠資料可供繪圖。</div>
      ) : (
        <>
          <div className="chart-wrap" aria-label="TACO 指數歷史曲線圖">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 18, right: 12, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--orange)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--orange)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => date.slice(5).replace('-', '/')}
                stroke="var(--chart-axis)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 70, 85, 100]} stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
              <ReferenceArea y1={0} y2={25} fill="var(--band-green)" fillOpacity={0.05} />
              <ReferenceArea y1={25} y2={50} fill="var(--band-yellow)" fillOpacity={0.05} />
              <ReferenceArea y1={50} y2={70} fill="var(--band-orange)" fillOpacity={0.05} />
              <ReferenceArea y1={70} y2={85} fill="var(--band-red)" fillOpacity={0.06} />
              <ReferenceArea y1={85} y2={100} fill="var(--band-deep-red)" fillOpacity={0.07} />
              <Tooltip content={<HistoryChartTooltip events={events} />} />
              <ReferenceLine y={70} stroke="var(--orange)" strokeDasharray="5 5" label={{ value: '警戒 70', fill: 'var(--orange)', position: 'insideTopRight', fontSize: 12 }} />
              <ReferenceLine y={85} stroke="var(--deep-red)" strokeDasharray="5 5" label={{ value: 'TACO 85', fill: 'var(--critical-text)', position: 'insideTopRight', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--taco)"
                strokeWidth={3}
                fill="url(#scoreGradient)"
                activeDot={{ r: 5, fill: 'var(--taco)', stroke: 'var(--bg)', strokeWidth: 2 }}
              />
              {maximum && periodLatest && maximum.date !== periodLatest.date && (
                <ReferenceDot
                  x={maximum.date}
                  y={maximum.score}
                  r={5}
                  fill="var(--orange)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
              {periodLatest && (
                <ReferenceDot
                  x={periodLatest.date}
                  y={periodLatest.score}
                  r={5}
                  fill="var(--taco)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {stats && (
            <dl className="history-stats" aria-label="所選期間歷史統計">
              <div>
                <dt>期間變化</dt>
                <dd>{stats.periodChange > 0 ? '+' : ''}{stats.periodChange.toFixed(0)} 分</dd>
              </div>
              <div>
                <dt>期間最高</dt>
                <dd>{stats.maximumScore.toFixed(0)} 分<small>{formatDate(stats.maximumDate)}</small></dd>
              </div>
              <div><dt>≥ 70 分</dt><dd>{stats.warningDays} 日</dd></div>
              <div><dt>≥ 85 分</dt><dd>{stats.criticalDays} 日</dd></div>
              <div><dt>最新百分位</dt><dd>{stats.latestPercentile}%</dd></div>
            </dl>
          )}
          <div className="history-insight" role="note" aria-label="所選期間文字判讀">
            <strong>期間判讀</strong>
            <p>{historySummary}</p>
            <span>依既定規則與公開歷史欄位產生，並非 AI 推論。</span>
          </div>
        </>
      )}
      <div className="chart-legend" aria-label="門檻說明">
        <span><i className="legend-line warning" />70 分 TACO 警戒</span>
        <span><i className="legend-line critical" />85 分 TACO 時刻</span>
      </div>
      <p className="history-method-note">
        歷史分數採 S&amp;P 500 交易日同步對齊；首頁最新分數使用各來源最新延遲觀測，兩者資料日期語意不同。
      </p>
    </section>
  )
}
