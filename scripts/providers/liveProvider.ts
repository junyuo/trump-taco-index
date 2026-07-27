import { FredProvider } from './fredProvider'
import { PortWatchProvider } from './portWatchProvider'
import type { DataProvider, ProviderSnapshot } from './types'

export class LiveProvider implements DataProvider {
  name = 'live'

  constructor(
    private readonly fred = new FredProvider(),
    private readonly portWatch = new PortWatchProvider(),
  ) {}

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const [brent, us10y, hormuz, sp500] = await Promise.all([
      this.fred.fetchBrent(),
      this.fred.fetchUs10y(),
      this.portWatch.fetchTransit(),
      this.fred.fetchSp500(),
    ])

    return {
      asOf: `${[brent, us10y, hormuz, sp500]
        .map((observation) => observation.observationDate)
        .sort()[0]}T00:00:00Z`,
      mode: 'delayed',
      observations: { brent, us10y, hormuz, sp500 },
    }
  }
}
