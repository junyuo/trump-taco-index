import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { IndicatorKey } from '../config/indexConfig'
import { indicatorPresentation } from '../lib/dashboardView'
import type { LatestData } from '../types/data'

const colors: Record<IndicatorKey, string> = {
  brent: 'var(--indicator-brent)',
  us10y: 'var(--indicator-us10y)',
  hormuz: 'var(--indicator-hormuz)',
  sp500: 'var(--indicator-sp500)',
}

export function ContributionChart({ latest }: { latest: LatestData }) {
  const data = (Object.entries(latest.indicators) as [IndicatorKey, LatestData['indicators']['brent']][])
    .map(([key, item]) => ({
      key,
      name: indicatorPresentation[key].shortLabel,
      contribution: item.contribution,
    }))
    .sort((left, right) => right.contribution - left.contribution)
  const leader = data[0]

  return (
    <section className="panel contribution-panel" aria-labelledby="contribution-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">WHAT MOVES THE INDEX</span>
          <h2 id="contribution-title">壓力貢獻</h2>
        </div>
        <span className="unit-label">加權標準差 σ</span>
      </div>
      <div className="contribution-chart" aria-label="四項指標壓力貢獻水平長條圖">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 18, left: 10, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" horizontal={false} />
            <XAxis type="number" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={104} stroke="var(--text-soft)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--chart-hover)' }}
              formatter={(value) => [
                typeof value === 'number' ? `${value.toFixed(2)}σ` : '—',
                '加權貢獻',
              ]}
              contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-line)', borderRadius: 8, color: 'var(--text)' }}
            />
            <Bar dataKey="contribution" radius={[0, 5, 5, 0]} barSize={18}>
              {data.map((item) => (
                <Cell fill={colors[item.key]} key={item.name} />
              ))}
              <LabelList
                dataKey="contribution"
                position="right"
                fill="var(--text)"
                fontSize={12}
                formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)}σ` : '—'}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="panel-note">
        目前最大壓力來源為<strong>{leader.name}</strong>（{leader.contribution.toFixed(2)}σ）。
        貢獻＝方向調整後的壓力 Z-score × 代理權重。
      </p>
    </section>
  )
}
