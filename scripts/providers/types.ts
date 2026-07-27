export type ProviderIndicatorKey = 'brent' | 'us10y' | 'hormuz' | 'sp500'
export type ProviderDataStatus = 'realtime' | 'delayed' | 'manual' | 'simulated'

export interface ProviderObservation {
  key: ProviderIndicatorKey
  label: string
  value: number
  previousValue: number
  unit: string
  history: number[]
  source: string
  sourceUrl?: string
  dataStatus: ProviderDataStatus
}

export interface ProviderSnapshot {
  asOf: string
  mode: 'live' | 'delayed' | 'manual' | 'demo'
  observations: Record<ProviderIndicatorKey, ProviderObservation>
}

export interface DataProvider {
  name: string
  fetchSnapshot(): Promise<ProviderSnapshot>
}
