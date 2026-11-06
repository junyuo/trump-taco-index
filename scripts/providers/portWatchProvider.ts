import { z } from 'zod'
import type { ProviderObservation, TimeSeriesPoint } from './types'

const portWatchResponseSchema = z.object({
  exceededTransferLimit: z.boolean().optional(),
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

const arcGisErrorSchema = z.object({
  error: z.object({ code: z.number(), message: z.string() }),
})

const pageSize = 1_000
const maxPages = 10

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

type Fetcher = (input: URL) => Promise<FetchResponse>

const endpoint =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'

export function normalizePortWatchObservations(
  payload: unknown,
  minimumValues: number,
): TimeSeriesPoint[] {
  const apiError = arcGisErrorSchema.safeParse(payload)
  if (apiError.success) {
    throw new Error(`IMF PortWatch ArcGIS 錯誤（${apiError.data.error.code}）：${apiError.data.error.message}`)
  }
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
  constructor(
    private readonly fetcher: Fetcher = (url) => fetch(url, { signal: AbortSignal.timeout(30_000) }),
  ) {}

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
    if (!Number.isInteger(limit) || limit < minimumValues || minimumValues < 1) {
      throw new Error('PortWatch limit 必須是整數且不小於 minimumValues')
    }
    // Basic paginated queries work when ArcGIS rejects orderByFields / field projections.
    // Read the complete series before sorting, so unordered pages cannot hide newer dates.
    const url = new URL(endpoint)
    url.searchParams.set('f', 'json')
    url.searchParams.set('where', "portid='chokepoint6'")
    url.searchParams.set('outFields', '*')
    url.searchParams.set('resultRecordCount', String(pageSize))
    url.searchParams.set('returnGeometry', 'false')

    const features: z.infer<typeof portWatchResponseSchema>['features'] = []
    for (let page = 0; page < maxPages; page += 1) {
      if (page > 0) url.searchParams.set('resultOffset', String(page * pageSize))
      const response = await this.fetcher(new URL(url))
      if (!response.ok) {
        throw new Error(`IMF PortWatch 請求失敗（HTTP ${response.status}）`)
      }
      const payload: unknown = await response.json()
      const apiError = arcGisErrorSchema.safeParse(payload)
      if (apiError.success) {
        throw new Error(`IMF PortWatch ArcGIS 錯誤（${apiError.data.error.code}）：${apiError.data.error.message}`)
      }
      const parsed = portWatchResponseSchema.parse(payload)
      features.push(...parsed.features)
      if (parsed.features.length < pageSize && parsed.exceededTransferLimit !== true) {
        return normalizePortWatchObservations({ features }, minimumValues).slice(-limit)
      }
    }
    throw new Error(`IMF PortWatch 超過 ${maxPages} 頁安全上限，拒絕使用不完整序列`)
  }
}
