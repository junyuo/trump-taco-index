import { rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildBackfillHistory } from './lib/backfill'
import { FredProvider } from './providers/fredProvider'
import { PortWatchProvider } from './providers/portWatchProvider'

const historyPath = resolve('public/data/history.json')
const maxAttempts = 3

async function writeJsonAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, path)
}

async function fetchSeries() {
  const fred = new FredProvider()
  const portWatch = new PortWatchProvider()
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const [brent, us10y, hormuz, sp500] = await Promise.all([
        fred.fetchBrentSeries(),
        fred.fetchUs10ySeries(),
        portWatch.fetchSeries(),
        fred.fetchSp500Series(),
      ])
      return { brent, us10y, hormuz, sp500 }
    } catch (error: unknown) {
      lastError = error
      console.error(`[backfill] 第 ${attempt}/${maxAttempts} 次抓取失敗`)
      if (attempt < maxAttempts) {
        await new Promise((resolveDelay) => {
          setTimeout(resolveDelay, attempt * 1_000)
        })
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('歷史資料抓取失敗')
}

async function main() {
  const publish = process.argv.includes('--publish')
  const history = buildBackfillHistory(await fetchSeries())
  const first = history[0]
  const last = history.at(-1)!
  console.log(
    `[backfill] 驗證 ${history.length} 筆真實歷史：${first.date} 至 ${last.date}，` +
      `分數範圍 ${Math.min(...history.map((item) => item.score))}–${Math.max(...history.map((item) => item.score))}`,
  )

  if (!publish) {
    console.log('[backfill] dry-run 完成；加上 --publish 才會覆蓋 history.json。')
    return
  }
  await writeJsonAtomically(historyPath, history)
  console.log('[backfill] history.json 已更新。')
}

main().catch((error: unknown) => {
  console.error('[backfill] 失敗；未覆蓋 history.json。')
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
