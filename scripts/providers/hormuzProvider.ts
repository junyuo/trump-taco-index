import { readFile } from 'node:fs/promises'
import type { ProviderObservation } from './types'

interface ManualHormuzFile {
  metadata: {
    unit: string
    notes: string
  }
  observations: Array<{
    date: string
    value: number
    source: string
  }>
}

export class HormuzProvider {
  constructor(
    private readonly path = new URL('../../data/manual/hormuz-transit.json', import.meta.url),
  ) {}

  async fetchTransit(): Promise<ProviderObservation> {
    const payload = JSON.parse(await readFile(this.path, 'utf8')) as ManualHormuzFile
    const values = payload.observations
      .map((item) => item.value)
      .filter(Number.isFinite)

    if (values.length < 3) {
      throw new Error('荷姆茲人工資料至少需要 3 筆有效觀測值')
    }

    return {
      key: 'hormuz',
      label: 'Strait of Hormuz Transit',
      value: values.at(-1)!,
      previousValue: values.at(-2)!,
      unit: payload.metadata.unit,
      history: values.slice(0, -1),
      source: `Manual repository dataset／${payload.metadata.notes}`,
      dataStatus: 'manual',
    }
  }
}
