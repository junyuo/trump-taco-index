import { z } from 'zod'
import type {
  ProviderIndicatorKey,
  ProviderObservation,
  TimeSeriesPoint,
} from './types'

const fredResponseSchema = z.object({
  observations: z.array(
    z.object({
      date: z.string().date(),
      value: z.string(),
    }),
  ),
})

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

type Fetcher = (input: URL) => Promise<FetchResponse>

interface FredSeriesDefinition {
  id: string
  key: ProviderIndicatorKey
  label: string
  unit: string
}

const fredSeries = {
  brent: {
    id: 'DCOILBRENTEU',
    key: 'brent',
    label: 'Brent Crude',
    unit: 'USD/barrel',
  },
  us10y: {
    id: 'DGS10',
    key: 'us10y',
    label: 'US 10Y Treasury',
    unit: '%',
  },
  sp500: {
    id: 'SP500',
    key: 'sp500',
    label: 'S&P 500',
    unit: 'points',
  },
} satisfies Record<'brent' | 'us10y' | 'sp500', FredSeriesDefinition>

export function normalizeFredObservations(payload: unknown, minimumValues: number): TimeSeriesPoint[] {
  const parsed = fredResponseSchema.parse(payload)
  const byDate = new Map<string, number>()

  for (const item of parsed.observations) {
    if (item.value === '.') continue
    const value = Number(item.value)
    if (Number.isFinite(value)) byDate.set(item.date, value)
  }

  const points = [...byDate]
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))

  if (points.length < minimumValues) {
    throw new Error(`FRED 有效觀測值不足：需要 ${minimumValues} 筆，實際 ${points.length} 筆`)
  }
  return points
}

export class FredProvider {
  constructor(
    private readonly apiKey = process.env.FRED_API_KEY,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  fetchBrent(): Promise<ProviderObservation> {
    return this.fetchObservation(fredSeries.brent)
  }

  fetchUs10y(): Promise<ProviderObservation> {
    return this.fetchObservation(fredSeries.us10y)
  }

  fetchSp500(): Promise<ProviderObservation> {
    return this.fetchObservation(fredSeries.sp500)
  }

  fetchBrentSeries(limit = 500, minimumValues = 61): Promise<TimeSeriesPoint[]> {
    return this.fetchSeries(fredSeries.brent.id, limit, minimumValues)
  }

  fetchUs10ySeries(limit = 500, minimumValues = 61): Promise<TimeSeriesPoint[]> {
    return this.fetchSeries(fredSeries.us10y.id, limit, minimumValues)
  }

  fetchSp500Series(limit = 500, minimumValues = 61): Promise<TimeSeriesPoint[]> {
    return this.fetchSeries(fredSeries.sp500.id, limit, minimumValues)
  }

  private async fetchObservation(definition: FredSeriesDefinition): Promise<ProviderObservation> {
    const points = await this.fetchSeries(definition.id, 120, 61)
    const current = points.at(-1)!
    const previous = points.at(-2)!

    return {
      key: definition.key,
      label: definition.label,
      value: current.value,
      previousValue: previous.value,
      observationDate: current.date,
      unit: definition.unit,
      history: points.slice(0, -1).map((point) => point.value),
      source: `Federal Reserve Bank of St. Louis (FRED), ${definition.id}`,
      sourceUrl: `https://fred.stlouisfed.org/series/${definition.id}`,
      dataStatus: 'delayed',
    }
  }

  private async fetchSeries(
    seriesId: string,
    limit: number,
    minimumValues: number,
  ): Promise<TimeSeriesPoint[]> {
    if (!this.apiKey) {
      throw new Error('FRED_API_KEY 未設定，無法取得 FRED 市場資料')
    }

    const url = new URL('https://api.stlouisfed.org/fred/series/observations')
    url.searchParams.set('series_id', seriesId)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('file_type', 'json')
    url.searchParams.set('sort_order', 'desc')
    url.searchParams.set('limit', String(limit))

    const response = await this.fetcher(url)
    if (!response.ok) {
      throw new Error(`FRED ${seriesId} 請求失敗（HTTP ${response.status}）`)
    }
    return normalizeFredObservations(await response.json(), minimumValues)
  }
}
