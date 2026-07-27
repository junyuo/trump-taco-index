import type { ProviderObservation } from './types'

export interface MarketDataAdapter {
  fetchSeries(symbol: string): Promise<{
    current: number
    previous: number
    history: number[]
    asOf: string
  }>
}

export class MarketProvider {
  constructor(private readonly adapter?: MarketDataAdapter) {}

  private async fetch(
    key: 'brent' | 'sp500',
    symbol: string,
    label: string,
    unit: string,
  ): Promise<ProviderObservation> {
    if (!this.adapter) {
      throw new Error(
        `尚未設定 ${label} 的市場資料 adapter。請在 GitHub Actions 透過 Secret 注入合法 API 憑證並實作 adapter。`,
      )
    }
    const result = await this.adapter.fetchSeries(symbol)
    return {
      key,
      label,
      value: result.current,
      previousValue: result.previous,
      unit,
      history: result.history,
      source: `Configured market provider (${symbol})`,
      dataStatus: 'delayed',
    }
  }

  fetchBrent() {
    return this.fetch('brent', 'BRENT', 'Brent Crude', 'USD/barrel')
  }

  fetchSp500() {
    return this.fetch('sp500', 'SPX', 'S&P 500', 'points')
  }
}
