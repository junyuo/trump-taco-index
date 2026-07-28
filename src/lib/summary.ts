import {
  getHistoryLeadingIndicatorKey,
  getHistoryStats,
  indicatorPresentation,
} from './dashboardView'
import { formatDate } from './format'
import type { HistoryItem, LatestData } from '../types/data'

const shortNames: Record<keyof LatestData['indicators'], string> = {
  brent: '布蘭特原油',
  us10y: '美國公債殖利率',
  hormuz: '荷姆茲海峽通行量',
  sp500: '美國股市',
}

export function buildObservationSummary(data: LatestData): string {
  const ranked = Object.entries(data.indicators).sort(
    ([, left], [, right]) => right.contribution - left.contribution,
  ) as [keyof LatestData['indicators'], LatestData['indicators']['brent']][]

  const leading = ranked.filter(([, item]) => item.contribution >= 0.15).slice(0, 2)
  const leaders =
    leading.length > 0
      ? leading.map(([key]) => shortNames[key]).join('與')
      : '各市場變數'

  const marketQualifier =
    data.index.score >= 85
      ? '整體壓力已進入 TACO 時刻觀察區，但政策是否轉向仍取決於政治與政策因素。'
      : data.index.score >= 70
        ? '整體指數已進入高壓警戒區，仍不代表政策必然改變。'
        : data.index.score >= 50
          ? '整體壓力明顯，但尚未進入 TACO 時刻區間。'
          : '整體市場壓力仍有限，距離高壓警戒區尚有距離。'

  return `目前主要壓力來自${leaders}。${marketQualifier}`
}

export function buildHistoryObservationSummary(history: HistoryItem[]): string {
  const stats = getHistoryStats(history)
  if (!stats) return '尚無歷史資料可供判讀。'
  if (history.length === 1) {
    return `目前僅有 ${formatDate(history[0].date)} 一筆歷史觀測，尚不足以判斷趨勢。`
  }

  const maximum = history.find((item) => item.date === stats.maximumDate)!
  const leaderKey = getHistoryLeadingIndicatorKey(maximum)
  const leaderLabel = leaderKey
    ? indicatorPresentation[leaderKey].shortLabel
    : '各指標皆未形成正向壓力'
  const changeText =
    stats.periodChange > 0
      ? `上升 ${stats.periodChange} 分`
      : stats.periodChange < 0
        ? `下降 ${Math.abs(stats.periodChange)} 分`
        : '持平'
  const thresholdText =
    stats.warningDays === 0
      ? '期間內沒有進入 70 分警戒區。'
      : `期間共有 ${stats.warningDays} 日達到 70 分以上，其中 ${stats.criticalDays} 日達到 85 分以上。`

  return `所選期間指數${changeText}。最高點為 ${formatDate(stats.maximumDate)} 的 ${stats.maximumScore} 分，當日主要壓力來自${leaderLabel}。${thresholdText}`
}
