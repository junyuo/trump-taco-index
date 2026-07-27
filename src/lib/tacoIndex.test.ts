import { describe, expect, it } from 'vitest'
import { indexConfig } from '../config/indexConfig'
import {
  TacoIndexError,
  calculateCompositeZ,
  calculateZScore,
  compositeZToScore,
  getIndexStatus,
  isStale,
  toPressureZ,
  validateWeights,
} from './tacoIndex'

describe('TACO index math', () => {
  it('正確計算 Z-score', () => {
    const zScore = calculateZScore({ currentValue: 5, history: [1, 2, 3, 4, 5] })
    expect(zScore).toBeCloseTo(Math.SQRT2, 8)
  })

  it('荷姆茲通行量下降時反轉為正壓力', () => {
    expect(toPressureZ('hormuz', -2.4)).toBe(2.4)
    expect(toPressureZ('hormuz', 1.2)).toBe(0)
  })

  it('S&P 500 下跌時反轉為正壓力', () => {
    expect(toPressureZ('sp500', -1.8)).toBe(1.8)
    expect(toPressureZ('sp500', 0.7)).toBe(0)
  })

  it('預設權重合計為 1', () => {
    expect(validateWeights(indexConfig.weights)).toBe(true)
    expect(Object.values(indexConfig.weights).reduce((sum, weight) => sum + weight, 0)).toBe(1)
  })

  it('拒絕合計不是 1 的權重', () => {
    expect(() =>
      validateWeights({ brent: 0.5, us10y: 0.25, hormuz: 0.25, sp500: 0.2 }),
    ).toThrow(TacoIndexError)
  })

  it.each([
    [0, 0],
    [1, 30],
    [2, 60],
    [2.9, 85],
    [3.4, 100],
    [4, 100],
  ])('將 %f 個標準差轉為 %i 分', (compositeZ, expected) => {
    expect(compositeZToScore(compositeZ)).toBe(expected)
  })

  it('分數永遠介於 0 與 100', () => {
    expect(compositeZToScore(-9)).toBe(0)
    expect(compositeZToScore(99)).toBe(100)
  })

  it('缺少歷史資料時回傳明確錯誤', () => {
    expect(() => calculateZScore({ currentValue: 10, history: [] })).toThrow(
      '計算 Z-score 需要有效的歷史資料',
    )
  })

  it('標準差為 0 時回傳 0，不產生 NaN 或 Infinity', () => {
    const result = calculateZScore({ currentValue: 9, history: [7, 7, 7] })
    expect(result).toBe(0)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('正確計算加權綜合壓力', () => {
    expect(
      calculateCompositeZ({ brent: 2, us10y: 1, hormuz: -2, sp500: -1 }),
    ).toBeCloseTo(1.55)
  })
})

describe('status bands', () => {
  it.each([
    [0, '還沒開火'],
    [24, '還沒開火'],
    [25, '玉米餅開始加熱'],
    [49, '玉米餅開始加熱'],
    [50, '餡料快包不住'],
    [69, '餡料快包不住'],
    [70, 'TACO 警戒'],
    [84, 'TACO 警戒'],
    [85, 'TACO 時刻'],
    [100, 'TACO 時刻'],
  ])('%i 分判斷為 %s', (score, expected) => {
    expect(getIndexStatus(score).name).toBe(expected)
  })
})

describe('freshness', () => {
  it('識別超過設定時數的過期資料', () => {
    const now = new Date('2026-07-27T12:00:00Z')
    expect(isStale('2026-07-26T09:00:00Z', now, 12)).toBe(true)
    expect(isStale('2026-07-27T08:00:00Z', now, 12)).toBe(false)
  })
})
