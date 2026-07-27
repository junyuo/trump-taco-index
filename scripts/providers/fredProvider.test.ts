import { describe, expect, it } from 'vitest'
import { FredProvider, normalizeFredObservations } from './fredProvider'

function observations(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    value: String(80 + index),
  }))
}

describe('FRED provider', () => {
  it('過濾缺值、排序日期並去除重複日期', () => {
    const input = observations(62)
    const duplicate = { ...input[20], value: '999' }
    const points = normalizeFredObservations(
      { observations: [input[61], { date: '2026-04-01', value: '.' }, ...input, duplicate] },
      61,
    )
    expect(points).toHaveLength(62)
    expect(points[0].date < points.at(-1)!.date).toBe(true)
    expect(points.find((point) => point.date === duplicate.date)?.value).toBe(999)
  })

  it('少於目前值加前 60 筆時失敗', () => {
    expect(() => normalizeFredObservations({ observations: observations(60) }, 61)).toThrow(
      'FRED 有效觀測值不足',
    )
  })

  it('HTTP error 會明確失敗', async () => {
    const provider = new FredProvider('test-key', async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }))
    await expect(provider.fetchBrent()).rejects.toThrow('HTTP 503')
  })
})
