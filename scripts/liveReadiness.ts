import { indexConfig, indicatorKeys } from '../src/config/indexConfig'
import type { LatestData } from '../src/types/data'

const forbiddenLiveMarkers = /\b(demo|simulated|manual)\b/i

export function assertLiveReadiness(data: LatestData, now = new Date()): true {
  if (data.dataMode !== 'delayed') {
    throw new Error(`live 資料模式必須是 delayed，目前為 ${data.dataMode}`)
  }

  const oldestObservationDate = indicatorKeys
    .map((key) => data.indicators[key].asOfDate)
    .sort()[0]
  if (data.asOf.slice(0, 10) !== oldestObservationDate) {
    throw new Error('latest.asOf 必須等於四項資料中最舊的觀測日期')
  }

  for (const key of indicatorKeys) {
    const indicator = data.indicators[key]
    if (indicator.dataStatus !== 'delayed') {
      throw new Error(`${key}.dataStatus 必須是 delayed`)
    }
    if (!indicator.sourceUrl) {
      throw new Error(`${key}.sourceUrl 為 live 資料必要欄位`)
    }
    const observationTime = Date.parse(`${indicator.asOfDate}T23:59:59Z`)
    const ageHours = (now.getTime() - observationTime) / (60 * 60 * 1_000)
    if (ageHours < 0) {
      throw new Error(`${key}.asOfDate 不可晚於驗證時間`)
    }
    if (ageHours > indexConfig.indicatorStaleAfterHours[key]) {
      throw new Error(
        `${key} 資料已超過 ${indexConfig.indicatorStaleAfterHours[key]} 小時 freshness 門檻`,
      )
    }
  }

  if (data.indicators.hormuz.unit !== 'vessels/day') {
    throw new Error('Hormuz live 資料單位必須是 vessels/day')
  }
  if (forbiddenLiveMarkers.test(JSON.stringify(data))) {
    throw new Error('live latest.json 不得包含 demo、simulated 或 manual 標記')
  }
  return true
}
