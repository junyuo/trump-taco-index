import { describe, expect, it } from 'vitest'
import { normalizePortWatchObservations, PortWatchProvider } from './portWatchProvider'

function features(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    attributes: {
      date: `2026-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
      portid: 'chokepoint6',
      portname: 'Strait of Hormuz',
      n_total: 70 + index,
    },
  }))
}

describe('IMF PortWatch provider', () => {
  it('接受 chokepoint6 並將倒序結果正規化', async () => {
    const provider = new PortWatchProvider(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ features: features(90).reverse() }),
    }))
    const observation = await provider.fetchTransit()
    expect(observation.key).toBe('hormuz')
    expect(observation.unit).toBe('vessels/day')
    expect(observation.observationDate).toBe('2026-04-06')
    expect(observation.dataStatus).toBe('delayed')
  })

  it('缺少 n_total 或負值時 schema validation 失敗', () => {
    const invalid = features(61)
    invalid[0].attributes.n_total = -1
    expect(() => normalizePortWatchObservations({ features: invalid }, 61)).toThrow()
  })

  it('非 chokepoint6 的資料不被接受', () => {
    const invalid = features(61)
    invalid[0].attributes.portid = 'chokepoint5'
    expect(() => normalizePortWatchObservations({ features: invalid }, 61)).toThrow()
  })
})
