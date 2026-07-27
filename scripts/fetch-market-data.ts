import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
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
import type { DataProvider, ProviderSnapshot } from './providers/types'

const latestPath = resolve('public/data/latest.json')
const historyPath = resolve('public/data/history.json')
const maxProviderAttempts = 3

interface SeriesSummary {
  mean: number
  standardDeviation: number
  zScore: number
}

function summarize(currentValue: number, history: number[]): SeriesSummary {
  const mean = history.reduce((sum, value) => sum + value, 0) / history.length
  const variance =
    history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / history.length
  return {
    mean,
    standardDeviation: Math.sqrt(variance),
    zScore: calculateZScore({ currentValue, history }),
  }
}

async function writeJsonAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, path)
}

async function fetchWithRetry(provider: DataProvider): Promise<ProviderSnapshot> {
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

export function createNextHistory(
  previousHistory: HistoryItem[],
  previousMode: LatestData['dataMode'],
  nextMode: LatestData['dataMode'],
  entry: HistoryItem,
): HistoryItem[] {
  const base = previousMode === 'demo' && nextMode !== 'demo' ? [] : previousHistory
  return historyDataSchema.parse(
    [...base.filter((item) => item.date !== entry.date), entry]
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-400),
  )
}

export function hasNewObservationBatch(previous: LatestData, next: LatestData): boolean {
  return (
    previous.dataMode !== next.dataMode ||
    indicatorKeys.some(
      (key) =>
        previous.indicators[key].asOfDate !== next.indicators[key].asOfDate ||
        previous.indicators[key].value !== next.indicators[key].value,
    )
  )
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.env.PUBLISH_DATA === 'false'
  const provider: DataProvider =
    process.env.DATA_PROVIDER === 'live' ? new LiveProvider() : new DemoProvider()

  console.log(`[data] 使用 ${provider.name} provider（${dryRun ? 'dry-run' : 'publish'}）`)
  const snapshot = await fetchWithRetry(provider)
  const summaries = Object.fromEntries(
    indicatorKeys.map((key) => {
      const observation = snapshot.observations[key]
      const history = observation.history.slice(-indexConfig.rollingWindow)
      if (history.length < indexConfig.rollingWindow) {
        throw new Error(
          `${key} 歷史資料不足，需要目前值之前 ${indexConfig.rollingWindow} 筆有效觀測值`,
        )
      }
      return [key, summarize(observation.value, history)]
    }),
  ) as Record<IndicatorKey, SeriesSummary>
  const zScores = Object.fromEntries(
    indicatorKeys.map((key) => [key, summaries[key].zScore]),
  ) as Record<IndicatorKey, number>

  const compositeZ = calculateCompositeZ(zScores)
  const score = compositeZToScore(compositeZ)
  const previousLatest = latestDataSchema.parse(JSON.parse(await readFile(latestPath, 'utf8')))
  const successfulUpdate = new Date().toISOString()

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
          asOfDate: observation.observationDate,
          dataStatus: observation.dataStatus,
        },
      ]
    }),
  ) as LatestData['indicators']

  const latest = latestDataSchema.parse({
    asOf: snapshot.asOf,
    lastSuccessfulUpdate: successfulUpdate,
    dataMode: snapshot.mode,
    index: { score, compositeZ, status: getIndexStatus(score).name },
    indicators,
  })
  const history = historyDataSchema.parse(JSON.parse(await readFile(historyPath, 'utf8')))
  const entry: HistoryItem = {
    date: snapshot.asOf.slice(0, 10),
    score,
    compositeZ,
    brentZ: zScores.brent,
    us10yZ: zScores.us10y,
    hormuzZ: zScores.hormuz,
    sp500Z: zScores.sp500,
  }
  const nextHistory = createNextHistory(history, previousLatest.dataMode, latest.dataMode, entry)

  for (const key of indicatorKeys) {
    const observation = snapshot.observations[key]
    const stats = summaries[key]
    console.log(
      `[data] ${key}: date=${observation.observationDate} value=${observation.value} ` +
        `mean60=${stats.mean.toFixed(4)} sd60=${stats.standardDeviation.toFixed(4)} ` +
        `z=${stats.zScore.toFixed(4)}`,
    )
  }
  console.log(`[data] compositeZ=${compositeZ.toFixed(4)} score=${score}`)

  if (dryRun) {
    console.log('[data] dry-run 驗證成功；未修改 public/data JSON。')
    return
  }

  if (!hasNewObservationBatch(previousLatest, latest)) {
    console.log('[data] 來源日期與數值未變，略過 JSON 寫入。')
    return
  }

  await writeJsonAtomically(latestPath, latest)
  await writeJsonAtomically(historyPath, nextHistory)
  console.log(`[data] 更新成功：${snapshot.asOf}，workflow 時間 ${successfulUpdate}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error('[data] 更新失敗，保留最後一份有效 JSON，未覆蓋任何檔案。')
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
