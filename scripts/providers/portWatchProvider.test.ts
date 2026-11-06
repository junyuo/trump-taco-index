import { describe, expect, it, vi } from 'vitest'
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
  it('完整讀取未排序分頁後才選取最新資料，不使用會出錯的排序與欄位投影', async () => {
    const rows = Array.from({ length: 1_005 }, (_, index) => ({
      attributes: {
        ...features(1)[0].attributes,
        date: new Date(Date.UTC(2023, 0, index + 1)).toISOString().slice(0, 10),
        n_total: index,
      },
    })).reverse()
    const fetcher = vi.fn(async (url: URL) => {
      expect(url.searchParams.get('where')).toBe("portid='chokepoint6'")
      expect(url.searchParams.get('outFields')).toBe('*')
      expect(url.searchParams.has('orderByFields')).toBe(false)
      expect(url.searchParams.get('resultRecordCount')).toBe('1000')
      const offset = Number(url.searchParams.get('resultOffset'))
      return { ok: true, status: 200, json: async () => ({ features: rows.slice(offset, offset + 1_000) }) }
    })
    const result = await new PortWatchProvider(fetcher).fetchSeries(550, 61)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(550)
    expect(result[0].value).toBe(455)
    expect(result.at(-1)?.value).toBe(1_004)
  })

  it('HTTP 200 中的 ArcGIS error 顯示真正原因', async () => {
    const provider = new PortWatchProvider(async () => ({
      ok: true, status: 200,
      json: async () => ({ error: { code: 400, message: 'Invalid URL' } }),
    }))
    await expect(provider.fetchSeries()).rejects.toThrow('ArcGIS 錯誤（400）：Invalid URL')
  })

  it('後續分頁失敗時不回傳部分序列', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: features(90), exceededTransferLimit: true }) })
      .mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(new PortWatchProvider(fetcher).fetchSeries()).rejects.toThrow('HTTP 503')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('分頁持續截斷時最多 10 頁即停止', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ features: features(61), exceededTransferLimit: true }),
    }))
    await expect(new PortWatchProvider(fetcher).fetchSeries()).rejects.toThrow('10 頁安全上限')
    expect(fetcher).toHaveBeenCalledTimes(10)
  })

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
