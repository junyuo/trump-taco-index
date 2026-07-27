import type { ProviderObservation } from './types'

interface FredObservation {
  date: string
  value: string
}

interface FredResponse {
  observations?: FredObservation[]
}

export class FredProvider {
  private readonly apiKey: string | undefined

  constructor(apiKey = process.env.FRED_API_KEY) {
    this.apiKey = apiKey
  }

  async fetchUs10y(): Promise<ProviderObservation> {
    if (!this.apiKey) {
      throw new Error('FRED_API_KEY 未設定，無法取得美國 10 年期公債殖利率')
    }

    const url = new URL('https://api.stlouisfed.org/fred/series/observations')
    url.searchParams.set('series_id', 'DGS10')
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('file_type', 'json')
    url.searchParams.set('sort_order', 'desc')
    url.searchParams.set('limit', '70')

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`FRED 請求失敗（HTTP ${response.status}）`)
    }
    const payload = (await response.json()) as FredResponse
    const values = (payload.observations ?? [])
      .map((item) => Number(item.value))
      .filter(Number.isFinite)

    if (values.length < 3) {
      throw new Error('FRED 回傳的有效 DGS10 觀測值不足')
    }

    return {
      key: 'us10y',
      label: 'US 10Y Treasury',
      value: values[0],
      previousValue: values[1],
      unit: '%',
      history: values.slice(1).reverse(),
      source: 'Federal Reserve Bank of St. Louis (FRED), DGS10',
      sourceUrl: 'https://fred.stlouisfed.org/series/DGS10',
      dataStatus: 'delayed',
    }
  }
}
