import { indexConfig, type IndicatorKey } from '../config/indexConfig'

export class TacoIndexError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TacoIndexError'
  }
}

export interface ZScoreInput {
  currentValue: number
  history: number[]
}

export interface IndicatorZScores {
  brent: number
  us10y: number
  hormuz: number
  sp500: number
}

export function calculateZScore({ currentValue, history }: ZScoreInput): number {
  if (!Number.isFinite(currentValue)) {
    throw new TacoIndexError('目前數值必須是有效數字')
  }
  if (history.length === 0 || history.some((value) => !Number.isFinite(value))) {
    throw new TacoIndexError('計算 Z-score 需要有效的歷史資料')
  }

  const mean = history.reduce((sum, value) => sum + value, 0) / history.length
  const variance =
    history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / history.length
  const standardDeviation = Math.sqrt(variance)

  return standardDeviation === 0 ? 0 : (currentValue - mean) / standardDeviation
}

export function toPressureZ(key: IndicatorKey, zScore: number): number {
  if (!Number.isFinite(zScore)) {
    throw new TacoIndexError(`${key} 的 Z-score 無效`)
  }

  const directedZ = key === 'hormuz' || key === 'sp500' ? -zScore : zScore
  return Math.max(0, directedZ)
}

export function calculateCompositeZ(
  zScores: IndicatorZScores,
  weights: Record<IndicatorKey, number> = indexConfig.weights,
): number {
  validateWeights(weights)

  return (Object.keys(weights) as IndicatorKey[]).reduce(
    (total, key) => total + toPressureZ(key, zScores[key]) * weights[key],
    0,
  )
}

export function compositeZToScore(compositeZ: number): number {
  if (!Number.isFinite(compositeZ)) {
    throw new TacoIndexError('綜合市場壓力必須是有效數字')
  }

  const value = Math.max(0, compositeZ)
  const points = indexConfig.scoreBreakpoints

  if (value >= points.at(-1)!.compositeZ) return 100

  for (let index = 1; index < points.length; index += 1) {
    const lower = points[index - 1]
    const upper = points[index]
    if (value <= upper.compositeZ) {
      const ratio = (value - lower.compositeZ) / (upper.compositeZ - lower.compositeZ)
      return Math.round(lower.score + ratio * (upper.score - lower.score))
    }
  }

  return 100
}

export function getIndexStatus(score: number) {
  const safeScore = Math.min(100, Math.max(0, Math.round(score)))
  return (
    indexConfig.statusBands.find(
      (status) => safeScore >= status.min && safeScore <= status.max,
    ) ?? indexConfig.statusBands[0]
  )
}

export function validateWeights(weights: Record<IndicatorKey, number>): true {
  const values = Object.values(weights)
  if (values.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new TacoIndexError('所有權重都必須是非負的有效數字')
  }
  const total = values.reduce((sum, weight) => sum + weight, 0)
  if (Math.abs(total - 1) > 1e-9) {
    throw new TacoIndexError(`指標權重合計必須為 1，目前為 ${total}`)
  }
  return true
}

export function isStale(
  asOf: string,
  now = new Date(),
  staleAfterHours = indexConfig.staleAfterHours,
): boolean {
  const timestamp = new Date(asOf).getTime()
  if (!Number.isFinite(timestamp)) {
    throw new TacoIndexError('資料時間格式無效')
  }
  return now.getTime() - timestamp > staleAfterHours * 60 * 60 * 1000
}
