import { describe, expect, it } from 'vitest'
import { FredProvider } from './fredProvider'
import { LiveProvider } from './liveProvider'
import { PortWatchProvider } from './portWatchProvider'

function dateAt(index: number): string {
  return new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10)
}

describe('live provider series reuse', () => {
  it('returns observations and aligned history series from the same API batch', async () => {
    let requests = 0
    const fred = new FredProvider('test-key', async (url) => {
      requests += 1
      const offset = url.searchParams.get('series_id') === 'SP500' ? 6000 : 1
      return {
        ok: true,
        status: 200,
        json: async () => ({
          observations: Array.from({ length: 70 }, (_, index) => ({
            date: dateAt(index),
            value: String(offset + index),
          })),
        }),
      }
    })
    const portWatch = new PortWatchProvider(async () => {
      requests += 1
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: Array.from({ length: 70 }, (_, index) => ({
            attributes: {
              date: dateAt(index),
              portid: 'chokepoint6',
              portname: 'Strait of Hormuz',
              n_total: 20 + index,
            },
          })),
        }),
      }
    })

    const snapshot = await new LiveProvider(fred, portWatch).fetchSnapshot()

    expect(requests).toBe(4)
    expect(snapshot.series?.sp500.at(-1)?.value).toBe(snapshot.observations.sp500.value)
    expect(snapshot.series?.hormuz.at(-1)?.date).toBe(snapshot.observations.hormuz.observationDate)
  })
})
