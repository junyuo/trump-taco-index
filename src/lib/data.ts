import {
  eventsDataSchema,
  historyDataSchema,
  latestDataSchema,
  type LatestData,
  type HistoryItem,
  type TacoEvent,
} from '../types/data'

export interface DashboardData {
  latest: LatestData
  history: HistoryItem[]
  events: TacoEvent[]
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`無法載入 ${path}（HTTP ${response.status}）`)
  }
  return response.json() as Promise<unknown>
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [latest, history, events] = await Promise.all([
    fetchJson('data/latest.json'),
    fetchJson('data/history.json'),
    fetchJson('data/events.json'),
  ])

  return {
    latest: latestDataSchema.parse(latest),
    history: historyDataSchema.parse(history),
    events: eventsDataSchema.parse(events),
  }
}
