import { FredProvider } from './fredProvider'
import { HormuzProvider } from './hormuzProvider'
import { MarketProvider } from './marketProvider'
import type { DataProvider, ProviderSnapshot } from './types'

export class LiveProvider implements DataProvider {
  name = 'live'

  constructor(
    private readonly fred = new FredProvider(),
    private readonly market = new MarketProvider(),
    private readonly hormuz = new HormuzProvider(),
  ) {}

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const [brent, us10y, hormuz, sp500] = await Promise.all([
      this.market.fetchBrent(),
      this.fred.fetchUs10y(),
      this.hormuz.fetchTransit(),
      this.market.fetchSp500(),
    ])

    return {
      asOf: new Date().toISOString(),
      mode: 'delayed',
      observations: { brent, us10y, hormuz, sp500 },
    }
  }
}
