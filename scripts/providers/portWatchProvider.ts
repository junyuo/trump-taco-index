import { z } from 'zod'
import type { ProviderObservation, TimeSeriesPoint } from './types'

const portWatchResponseSchema = z.object({
  features: z.array(
    z.object({
      attributes: z.object({
        date: z.string().date(),
        portid: z.literal('chokepoint6'),
        portname: z.string().min(1),
        n_total: z.number().finite().nonnegative(),
      }),
    }),
  ),
})

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

type Fetcher = (input: URL) => Promise<FetchResponse>

const endpoint =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'

export function normalizePortWatchObservations(
  payload: unknown,
  minimumValues: number,
): TimeSeriesPoint[] {
  const parsed = portWatchResponseSchema.parse(payload)
  const byDate = new Map<string, number>()
  for (const { attributes } of parsed.features) {
    byDate.set(attributes.date, attributes.n_total)
  }
  const points = [...byDate]
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))

  if (points.length < minimumValues) {
    throw new Error(`PortWatch 有效觀測值不足：需要 ${minimumValues} 筆，實際 ${points.length} 筆`)
  }
  return points
}

export class PortWatchProvider {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async fetchTransit(): Promise<ProviderObservation> {
    const points = await this.fetchSeries(90, 90)
    const current = points.at(-1)!
    const previous = points.at(-2)!
    return {
      key: 'hormuz',
      label: 'Strait of Hormuz Transit Calls',
      value: current.value,
      previousValue: previous.value,
      observationDate: current.date,
      unit: 'vessels/day',
      history: points.slice(0, -1).map((point) => point.value),
      source: 'UN Global Platform; IMF PortWatch, Daily Chokepoints Data',
      sourceUrl: 'https://portwatch.imf.org/',
      dataStatus: 'delayed',
    }
  }

  async fetchSeries(limit = 550, minimumValues = 61): Promise<TimeSeriesPoint[]> {
    const url = new URL(endpoint)
    url.searchParams.set('f', 'json')
    url.searchParams.set('where', "portid='chokepoint6'")
    url.searchParams.set('outFields', 'date,portid,portname,n_total')
    url.searchParams.set('orderByFields', 'date DESC')
    url.searchParams.set('resultRecordCount', String(limit))
    url.searchParams.set('returnGeometry', 'false')

    const response = await this.fetcher(url)
    if (!response.ok) {
      throw new Error(`IMF PortWatch 請求失敗（HTTP ${response.status}）`)
    }
    return normalizePortWatchObservations(await response.json(), minimumValues)
  }
}
