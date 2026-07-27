import type {
  DataProvider,
  ProviderIndicatorKey,
  ProviderObservation,
  ProviderSnapshot,
} from './types'

function baseline(center: number, amplitude: number, length = 60): number[] {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin(index * 0.71) * amplitude
    const cycle = Math.cos(index * 0.23) * amplitude * 0.35
    return Number((center + wave + cycle).toFixed(4))
  })
}

function observation(
  key: ProviderIndicatorKey,
  label: string,
  value: number,
  previousValue: number,
  unit: string,
  history: number[],
  source = 'Deterministic demo fixture／非真實行情',
  observationDate = new Date().toISOString().slice(0, 10),
): ProviderObservation {
  return {
    key,
    label,
    value,
    previousValue,
    observationDate,
    unit,
    history,
    source,
    dataStatus: 'simulated',
  }
}

export class DemoProvider implements DataProvider {
  name = 'demo'

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const date = process.env.TACO_AS_OF ?? new Date().toISOString().slice(0, 10)
    return {
      asOf: `${date}T09:00:00Z`,
      mode: 'demo',
      observations: {
        brent: observation('brent', 'Brent Crude', 96.78, 93.16, 'USD/barrel', baseline(82, 5), undefined, date),
        us10y: observation('us10y', 'US 10Y Treasury', 4.72, 4.67, '%', baseline(4.18, 0.18), undefined, date),
        hormuz: {
          ...observation(
            'hormuz',
            'Strait of Hormuz Transit',
            72,
            77,
            'vessels/day',
            baseline(99, 5),
            'Demo manual dataset／人工維護示範',
            date,
          ),
          dataStatus: 'manual',
        },
        sp500: observation('sp500', 'S&P 500', 6028.41, 6158.99, 'points', baseline(6480, 140), undefined, date),
      },
    }
  }
}
