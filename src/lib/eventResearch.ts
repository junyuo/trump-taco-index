import {
  eventSchema,
  type TacoEvent,
  type TacoEventCandidate,
} from '../types/data'

export function calculateDaysToPivot(
  threatDate: string,
  pivotDate: string | null,
): number | null {
  if (!pivotDate) return null
  const dayMilliseconds = 24 * 60 * 60 * 1_000
  const days =
    (Date.parse(`${pivotDate}T00:00:00Z`) -
      Date.parse(`${threatDate}T00:00:00Z`)) /
    dayMilliseconds
  if (days < 0) throw new Error('政策轉向日期不得早於威脅日期')
  return days
}

export function deriveEventClassification(
  criteria: TacoEventCandidate['criteria'],
  daysToPivot: number | null,
): TacoEvent['tacoClassification'] {
  if (!criteria.pivotConfirmed || daysToPivot === null) return 'pending'

  const withinWindow = criteria.timingAligned && daysToPivot <= 45
  if (
    criteria.threatConfirmed &&
    withinWindow &&
    criteria.marketStressObserved &&
    criteria.contemporaneousLink
  ) {
    return 'likely'
  }

  const supportingSignals = [
    withinWindow,
    criteria.marketStressObserved,
    criteria.contemporaneousLink,
  ].filter(Boolean).length
  return criteria.threatConfirmed && supportingSignals >= 2 ? 'possible' : 'unlikely'
}

export function deriveEventConfidence(
  candidate: TacoEventCandidate,
): TacoEvent['confidence'] {
  const primaryCount = candidate.sources.filter(
    (source) => source.type === 'primary-policy',
  ).length
  const reportingCount = candidate.sources.filter(
    (source) => source.type === 'reporting',
  ).length
  const hasMarketSource = candidate.sources.some(
    (source) => source.type === 'market-data',
  )
  const hasMarketEvidence = candidate.marketEvidence !== null

  if (primaryCount >= 2 && reportingCount >= 2 && hasMarketSource && hasMarketEvidence) {
    return 'high'
  }
  if (primaryCount >= 2 && reportingCount >= 1 && hasMarketSource && hasMarketEvidence) {
    return 'medium'
  }
  return 'low'
}

export function prepareApprovedEvent(candidate: TacoEventCandidate): TacoEvent {
  if (candidate.reviewStatus !== 'approved') {
    throw new Error(`${candidate.id} 尚未通過人工審核`)
  }
  if (!candidate.marketEvidence) {
    throw new Error(`${candidate.id} 缺少可重算的市場證據`)
  }
  const sourceTypes = new Set(candidate.sources.map((source) => source.type))
  for (const required of ['primary-policy', 'market-data', 'reporting'] as const) {
    if (!sourceTypes.has(required)) throw new Error(`${candidate.id} 缺少 ${required} 來源`)
  }

  const daysToPivot = calculateDaysToPivot(candidate.threatDate, candidate.pivotDate)
  const confidence = deriveEventConfidence(candidate)
  if (confidence === 'low') throw new Error(`${candidate.id} 信心不足，不得發布`)

  return eventSchema.parse({
    ...candidate,
    daysToPivot,
    tacoClassification: deriveEventClassification(candidate.criteria, daysToPivot),
    confidence,
    marketEvidence: candidate.marketEvidence,
  })
}
