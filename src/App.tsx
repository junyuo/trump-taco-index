import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowDown, Gauge as GaugeIcon, Info, RefreshCw } from 'lucide-react'
import { ContributionChart } from './components/ContributionChart'
import { DataStatusBanner } from './components/DataStatusBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EventTimeline } from './components/EventTimeline'
import { Gauge } from './components/Gauge'
import { HistoryChart } from './components/HistoryChart'
import { IndicatorCard } from './components/IndicatorCard'
import { Methodology } from './components/Methodology'
import { loadDashboardData, type DashboardData } from './lib/data'
import { buildObservationSummary } from './lib/summary'
import { indicatorKeys } from './config/indexConfig'
import { isIndicatorStale } from './lib/tacoIndex'

const cardAccents = ['#f0b651', '#ee8052', '#d66a43', '#a84955']
const modeLabels = {
  live: 'LIVE DATA',
  delayed: 'DELAYED DATA',
  manual: 'MANUAL DATA',
  demo: 'DEMO DATA',
} as const

function LoadingDashboard() {
  return (
    <main className="loading-dashboard" aria-busy="true" aria-label="正在載入市場資料">
      <div className="loading-line wide" />
      <div className="loading-line medium" />
      <div className="loading-grid">
        {Array.from({ length: 4 }, (_, index) => <div className="loading-card" key={index} />)}
      </div>
      <span>正在驗證市場資料…</span>
    </main>
  )
}

function Dashboard({ data }: { data: DashboardData }) {
  const stale = indicatorKeys.some((key) =>
    isIndicatorStale(key, data.latest.indicators[key].asOfDate),
  )
  const summary = buildObservationSummary(data.latest)

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="回到首頁">
          <span className="taco-mark" aria-hidden="true"><i /></span>
          <span>
            <strong>TRUMP TACO INDEX</strong>
            <small>MARKET PRESSURE MONITOR</small>
          </span>
        </a>
        <nav aria-label="主要導覽">
          <a href="#dashboard">市場儀表板</a>
          <a href="#timeline">事件紀錄</a>
          <a href="#methodology">方法論</a>
        </nav>
        <span className="header-mode"><i aria-hidden="true" /> {modeLabels[data.latest.dataMode]}</span>
      </header>

      <main id="top">
        <DataStatusBanner data={data.latest} stale={stale} />

        <section className="hero" id="dashboard">
          <div className="hero-copy">
            <span className="eyebrow"><Activity aria-hidden="true" size={15} /> MARKET STRESS, EXPLAINED</span>
            <h1>
              <span>Trump TACO Index</span>
              川普政策退縮壓力指數
            </h1>
            <p className="hero-lead">市場還能承受多久？用四個市場變數觀察下一個 TACO 時刻。</p>
            <p className="hero-line">市場先被嚇一跳，政策再往後退一步。</p>
            <a className="scroll-link" href="#indicators">
              查看壓力來源 <ArrowDown aria-hidden="true" size={16} />
            </a>
          </div>
          <Gauge
            score={data.latest.index.score}
            compositeZ={data.latest.index.compositeZ}
            asOf={data.latest.asOf}
          />
        </section>

        <aside className="model-notice" aria-label="模型與投資免責聲明">
          <Info aria-hidden="true" size={20} />
          <p>
            <strong>這不是占卜，是把市場的胃痛量化。</strong>
            本站指數為市場觀察模型，不是 Signum Global Advisors 官方指數，也不是投資建議。由於原始模型的完整公式與權重並未公開，本站採用可解釋的代理模型重建市場壓力指標。
          </p>
        </aside>

        <section className="indicator-section" id="indicators" aria-labelledby="indicators-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LIVE PRESSURE INPUTS</span>
              <h2 id="indicators-title">四項市場壓力訊號</h2>
            </div>
            <p>指數越高，代表市場壓力越接近歷史上的政策轉向區域。</p>
          </div>
          <div className="indicator-grid">
            {Object.values(data.latest.indicators).map((indicator, index) => (
              <IndicatorCard indicator={indicator} accent={cardAccents[index]} key={indicator.label} />
            ))}
          </div>
        </section>

        <section className="chart-grid">
          <ErrorBoundary fallbackTitle="歷史走勢暫時無法顯示">
            <HistoryChart history={data.history} events={data.events} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="壓力貢獻暫時無法顯示">
            <ContributionChart latest={data.latest} />
          </ErrorBoundary>
        </section>

        <section className="observation-panel" aria-labelledby="observation-title">
          <div className="observation-icon" aria-hidden="true"><GaugeIcon /></div>
          <div>
            <span className="eyebrow">RULE-BASED BRIEF</span>
            <h2 id="observation-title">今日觀察摘要</h2>
            <p>{summary}</p>
          </div>
          <span className="rules-badge">規則式產生</span>
        </section>

        <div id="timeline">
          <EventTimeline events={data.events} />
        </div>
        <Methodology />
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="taco-mark" aria-hidden="true"><i /></span>
          <span><strong>TRUMP TACO INDEX</strong><small>AN OPEN MARKET OBSERVATION PROJECT</small></span>
        </div>
        <p>僅供教育與研究用途，不構成投資建議。資料時間與狀態請以各卡片標示為準。</p>
        <p>© 2026 Trump TACO Index</p>
      </footer>
    </>
  )
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    loadDashboardData()
      .then(setData)
      .catch((reason: unknown) => {
        console.error(reason)
        setError(reason instanceof Error ? reason.message : '資料格式不正確')
      })
  }, [])

  useEffect(() => {
    loadDashboardData()
      .then(setData)
      .catch((reason: unknown) => {
        console.error(reason)
        setError(reason instanceof Error ? reason.message : '資料格式不正確')
      })
  }, [])

  if (error) {
    return (
      <main className="fatal-state" role="alert">
        <span className="eyebrow">DATA VALIDATION ERROR</span>
        <h1>市場資料暫時無法載入</h1>
        <p>{error}</p>
        <button type="button" onClick={load}><RefreshCw aria-hidden="true" size={17} />重新嘗試</button>
      </main>
    )
  }

  if (!data) return <LoadingDashboard />

  return <Dashboard data={data} />
}
