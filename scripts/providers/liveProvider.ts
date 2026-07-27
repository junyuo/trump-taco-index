import { FredProvider } from './fredProvider'
import { PortWatchProvider } from './portWatchProvider'
import type {
  DataProvider,
  ProviderIndicatorKey,
  ProviderObservation,
  ProviderSnapshot,
  TimeSeriesPoint,
} from './types'

const definitions: Record<
  ProviderIndicatorKey,
  Pick<ProviderObservation, 'key' | 'label' | 'unit' | 'source' | 'sourceUrl'>
> = {
  brent: {
    key: 'brent',
    label: 'Brent Crude',
    unit: 'USD/barrel',
    source: 'Federal Reserve Bank of St. Louis (FRED), DCOILBRENTEU',
    sourceUrl: 'https://fred.stlouisfed.org/series/DCOILBRENTEU',
  },
  us10y: {
    key: 'us10y',
    label: 'US 10Y Treasury',
    unit: '%',
    source: 'Federal Reserve Bank of St. Louis (FRED), DGS10',
    sourceUrl: 'https://fred.stlouisfed.org/series/DGS10',
  },
  hormuz: {
    key: 'hormuz',
    label: 'Strait of Hormuz Transit Calls',
    unit: 'vessels/day',
    source: 'UN Global Platform; IMF PortWatch, Daily Chokepoints Data',
    sourceUrl: 'https://portwatch.imf.org/',
  },
  sp500: {
    key: 'sp500',
    label: 'S&P 500',
    unit: 'points',
    source: 'Federal Reserve Bank of St. Louis (FRED), SP500',
    sourceUrl: 'https://fred.stlouisfed.org/series/SP500',
  },
}

function toObservation(
  key: ProviderIndicatorKey,
  points: TimeSeriesPoint[],
): ProviderObservation {
  const current = points.at(-1)!
  const previous = points.at(-2)!
  return {
    ...definitions[key],
    value: current.value,
    previousValue: previous.value,
    observationDate: current.date,
    history: points.slice(0, -1).map((point) => point.value),
    dataStatus: 'delayed',
  }
}

export class LiveProvider implements DataProvider {
  name = 'live'

  constructor(
    private readonly fred = new FredProvider(),
    private readonly portWatch = new PortWatchProvider(),
  ) {}

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const [brentSeries, us10ySeries, hormuzSeries, sp500Series] = await Promise.all([
      this.fred.fetchBrentSeries(),
      this.fred.fetchUs10ySeries(),
      this.portWatch.fetchSeries(),
      this.fred.fetchSp500Series(),
    ])
    const series = {
      brent: brentSeries,
      us10y: us10ySeries,
      hormuz: hormuzSeries,
      sp500: sp500Series,
    }
    const observations = {
      brent: toObservation('brent', brentSeries),
      us10y: toObservation('us10y', us10ySeries),
      hormuz: toObservation('hormuz', hormuzSeries),
      sp500: toObservation('sp500', sp500Series),
    }

    return {
      asOf: `${Object.values(observations)
        .map((observation) => observation.observationDate)
        .sort()[0]}T00:00:00Z`,
      mode: 'delayed',
      observations,
      series,
    }
  }
}
