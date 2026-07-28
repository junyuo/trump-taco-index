import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, Menu, RefreshCw } from 'lucide-react'
import { ContributionChart } from './components/ContributionChart'
import { DataStatusBanner } from './components/DataStatusBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EventTimeline } from './components/EventTimeline'
import { HistoryChart } from './components/HistoryChart'
import { IndicatorCard } from './components/IndicatorCard'
import { MarketPulse } from './components/MarketPulse'
import { Methodology } from './components/Methodology'
import { ThemeToggle } from './components/ThemeToggle'
import { loadDashboardData, type DashboardData } from './lib/data'
import { buildObservationSummary } from './lib/summary'
import { indicatorKeys } from './config/indexConfig'
import { isIndicatorStale } from './lib/tacoIndex'

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
  const mobileNavRef = useRef<HTMLDetailsElement>(null)
  const staleIndicators = indicatorKeys.filter((key) =>
    isIndicatorStale(key, data.latest.indicators[key].asOfDate),
  )
  const summary = buildObservationSummary(data.latest)
  const maxContribution = Math.max(
    ...indicatorKeys.map((key) => data.latest.indicators[key].contribution),
    0,
  )
  const closeMobileNav = () => {
    if (mobileNavRef.current) mobileNavRef.current.open = false
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="回到首頁">
          <span className="taco-mark" aria-hidden="true"><i /></span>
          <span>
            <strong>TACO Index</strong>
            <small>市場壓力觀察</small>
          </span>
        </a>
        <nav aria-label="主要導覽">
          <a href="#dashboard">市場脈搏</a>
          <a href="#indicators">壓力訊號</a>
          <a href="#timeline">事件紀錄</a>
          <a href="#methodology">方法論</a>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <span className="header-mode"><i aria-hidden="true" /> {modeLabels[data.latest.dataMode]}</span>
          <details className="mobile-nav" ref={mobileNavRef}>
            <summary aria-label="開啟主要導覽"><Menu aria-hidden="true" size={20} /></summary>
            <nav aria-label="行動版主要導覽">
              <a href="#dashboard" onClick={closeMobileNav}>市場脈搏</a>
              <a href="#indicators" onClick={closeMobileNav}>壓力訊號</a>
              <a href="#timeline" onClick={closeMobileNav}>事件研究區</a>
              <a href="#methodology" onClick={closeMobileNav}>方法論</a>
            </nav>
          </details>
        </div>
      </header>

      <main id="top">
        <DataStatusBanner data={data.latest} staleIndicators={staleIndicators} />

        <MarketPulse latest={data.latest} summary={summary} />

        <aside className="transparency-strip" aria-label="模型與投資免責聲明">
          <Info aria-hidden="true" size={20} />
          <p>
            <strong>透明代理模型</strong>
            本站不是 Signum Global Advisors 官方指數，也不是投資建議；完整公式未公開，因此採用可解釋的 Z-score 與代理權重衡量市場壓力。
            <a href="#methodology">查看方法與限制</a>
          </p>
        </aside>

        <section className="indicator-section" id="indicators" aria-labelledby="indicators-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">MARKET INPUTS</span>
              <h2 id="indicators-title">四項市場壓力訊號</h2>
            </div>
            <p>指數越高，代表市場壓力越接近歷史上的政策轉向區域。</p>
          </div>
          <div className="indicator-grid">
            {indicatorKeys.map((key) => (
              <IndicatorCard
                indicatorKey={key}
                indicator={data.latest.indicators[key]}
                stale={staleIndicators.includes(key)}
                maxContribution={maxContribution}
                key={key}
              />
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

        <div className="research-stack">
          <div id="timeline">
            <EventTimeline events={data.events} />
          </div>
          <Methodology />
        </div>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="taco-mark" aria-hidden="true"><i /></span>
          <span><strong>TACO Index</strong><small>開放市場觀察專案</small></span>
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
