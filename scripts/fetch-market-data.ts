import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { indexConfig, indicatorKeys, type IndicatorKey } from '../src/config/indexConfig'
import {
  calculateCompositeZ,
  calculateZScore,
  compositeZToScore,
  getIndexStatus,
  toPressureZ,
} from '../src/lib/tacoIndex'
import { historyDataSchema, latestDataSchema, type HistoryItem, type LatestData } from '../src/types/data'
import { DemoProvider } from './providers/demoProvider'
import { LiveProvider } from './providers/liveProvider'
import type { DataProvider } from './providers/types'

const latestPath = resolve('public/data/latest.json')
const historyPath = resolve('public/data/history.json')
const maxProviderAttempts = 3

async function writeJsonAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, path)
}

async function fetchWithRetry(provider: DataProvider) {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxProviderAttempts; attempt += 1) {
    try {
      return await provider.fetchSnapshot()
    } catch (error: unknown) {
      lastError = error
      console.error(`[data] provider 第 ${attempt}/${maxProviderAttempts} 次嘗試失敗`)
      if (attempt < maxProviderAttempts) {
        await new Promise((resolveDelay) => {
          setTimeout(resolveDelay, attempt * 1_000)
        })
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('資料 provider 連續失敗')
}

async function main() {
  const provider: DataProvider =
    process.env.DATA_PROVIDER === 'live' ? new LiveProvider() : new DemoProvider()

  console.log(`[data] 使用 ${provider.name} provider`)
  const snapshot = await fetchWithRetry(provider)
  const zScores = Object.fromEntries(
    indicatorKeys.map((key) => {
      const observation = snapshot.observations[key]
      const history = observation.history.slice(-indexConfig.rollingWindow)
      if (history.length < 3) {
        throw new Error(`${key} 歷史資料不足，至少需要 3 筆有效觀測值`)
      }
      return [key, calculateZScore({ currentValue: observation.value, history })]
    }),
  ) as Record<IndicatorKey, number>

  const compositeZ = calculateCompositeZ(zScores)
  const score = compositeZToScore(compositeZ)
  const previousLatest = latestDataSchema.parse(JSON.parse(await readFile(latestPath, 'utf8')))

  const indicators = Object.fromEntries(
    indicatorKeys.map((key) => {
      const observation = snapshot.observations[key]
      const pressureZ = toPressureZ(key, zScores[key])
      return [
        key,
        {
          label: observation.label,
          value: observation.value,
          unit: observation.unit,
          dailyChangePercent:
            observation.previousValue === 0
              ? 0
              : ((observation.value - observation.previousValue) / observation.previousValue) * 100,
          zScore: zScores[key],
          pressureZ,
          weight: indexConfig.weights[key],
          contribution: pressureZ * indexConfig.weights[key],
          source: observation.source,
          ...(observation.sourceUrl ? { sourceUrl: observation.sourceUrl } : {}),
          dataStatus: observation.dataStatus,
        },
      ]
    }),
  ) as LatestData['indicators']

  const latest: LatestData = {
    asOf: snapshot.asOf,
    lastSuccessfulUpdate: snapshot.asOf,
    dataMode: snapshot.mode,
    index: { score, compositeZ, status: getIndexStatus(score).name },
    indicators,
  }
  latestDataSchema.parse(latest)

  const history = historyDataSchema.parse(JSON.parse(await readFile(historyPath, 'utf8')))
  const date = snapshot.asOf.slice(0, 10)
  const entry: HistoryItem = {
    date,
    score,
    compositeZ,
    brentZ: zScores.brent,
    us10yZ: zScores.us10y,
    hormuzZ: zScores.hormuz,
    sp500Z: zScores.sp500,
  }
  const nextHistory = [...history.filter((item) => item.date !== date), entry]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-400)

  await writeJsonAtomically(latestPath, latest)
  await writeJsonAtomically(historyPath, nextHistory)
  console.log(`[data] 更新成功：${snapshot.asOf}，指數 ${score}，綜合壓力 ${compositeZ.toFixed(3)}σ`)
  console.log(`[data] 上一次成功更新：${previousLatest.lastSuccessfulUpdate}`)
}

main().catch((error: unknown) => {
  console.error('[data] 更新失敗，保留最後一份有效 JSON，未覆蓋任何檔案。')
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
