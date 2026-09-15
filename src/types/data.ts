import { z } from 'zod'

export const dataModeSchema = z.enum(['live', 'delayed', 'manual', 'demo'])
export const dataStatusSchema = z.enum(['realtime', 'delayed', 'manual', 'simulated'])

export const indicatorSchema = z.object({
  label: z.string().min(1),
  latestValue: z.number().finite(),
  latestObservationDate: z.string().date(),
  latestDailyChangePercent: z.number().finite(),
  alignedValue: z.number().finite(),
  alignedObservationDate: z.string().date(),
  unit: z.string().min(1),
  zScore: z.number().finite(),
  pressureZ: z.number().finite().nonnegative(),
  weight: z.number().finite().min(0).max(1),
  contribution: z.number().finite().nonnegative(),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  dataStatus: dataStatusSchema,
})

export const latestDataSchema = z.object({
  asOf: z.string().datetime(),
  lastSuccessfulUpdate: z.string().datetime(),
  dataMode: dataModeSchema,
  index: z.object({
    score: z.number().min(0).max(100),
    compositeZ: z.number().finite().nonnegative(),
    status: z.string().min(1),
    scoreAsOf: z.string().date(),
    previousScore: z.number().min(0).max(100).nullable(),
    scoreChange: z.number().finite().nullable(),
  }),
  indicators: z.object({
    brent: indicatorSchema,
    us10y: indicatorSchema,
    hormuz: indicatorSchema,
    sp500: indicatorSchema,
  }),
}).superRefine((data, context) => {
  if (data.asOf.slice(0, 10) !== data.index.scoreAsOf) {
    context.addIssue({ code: 'custom', path: ['asOf'], message: 'asOf 必須等於 scoreAsOf' })
  }
  if (
    data.index.previousScore === null
      ? data.index.scoreChange !== null
      : data.index.scoreChange !== data.index.score - data.index.previousScore
  ) {
    context.addIssue({ code: 'custom', path: ['index', 'scoreChange'], message: 'scoreChange 與 previousScore 不一致' })
  }
  for (const [key, indicator] of Object.entries(data.indicators)) {
    if (indicator.alignedObservationDate > data.index.scoreAsOf) {
      context.addIssue({
        code: 'custom',
        path: ['indicators', key, 'alignedObservationDate'],
        message: 'aligned observation 不可晚於 scoreAsOf',
      })
    }
  }
})

export const historyItemSchema = z.object({
  date: z.string().date(),
  score: z.number().min(0).max(100),
  compositeZ: z.number().finite().nonnegative(),
  brentZ: z.number().finite(),
  us10yZ: z.number().finite(),
  hormuzZ: z.number().finite(),
  sp500Z: z.number().finite(),
})

export const historyDataSchema = z.array(historyItemSchema)

export const eventSourceTypeSchema = z.enum([
  'primary-policy',
  'market-data',
  'reporting',
])

export const eventCriteriaSchema = z.object({
  threatConfirmed: z.boolean(),
  pivotConfirmed: z.boolean(),
  marketStressObserved: z.boolean(),
  timingAligned: z.boolean(),
  contemporaneousLink: z.boolean(),
})

export const eventMarketEvidenceSchema = z.object({
  baselineDate: z.string().date(),
  peakDate: z.string().date(),
  baselineScore: z.number().min(0).max(100),
  peakScore: z.number().min(0).max(100),
  scoreChange: z.number().finite(),
  leadingIndicators: z.array(z.enum(['brent', 'us10y', 'hormuz', 'sp500'])),
})

export const eventSourceSchema = z.object({
  type: eventSourceTypeSchema.optional(),
  title: z.string().min(1),
  publisher: z.string().min(1),
  date: z.string().date(),
  url: z.string().url().refine((url) => url.startsWith('https://'), {
    message: '事件來源必須使用 HTTPS',
  }),
})

const eventBaseSchema = z.object({
  id: z.string().min(1),
  threatDate: z.string().date(),
  pivotDate: z.string().date().nullable(),
  category: z.enum(['tariff', 'military', 'trade', 'other']),
  title: z.string().min(1),
  threatSummary: z.string().min(1),
  pivotSummary: z.string().min(1),
  marketReaction: z.string().min(1),
  daysToPivot: z.number().int().nonnegative().nullable(),
  tacoClassification: z.enum(['likely', 'possible', 'unlikely', 'pending']),
  confidence: z.enum(['high', 'medium', 'low']),
  lastReviewedAt: z.string().date().optional(),
  marketEvidence: eventMarketEvidenceSchema.optional(),
  criteria: eventCriteriaSchema.optional(),
  sources: z.array(eventSourceSchema),
})

export const eventSchema = eventBaseSchema.superRefine((event, context) => {
  if (event.confidence !== 'high') return
  const sourceTypes = new Set(event.sources.map((source) => source.type))
  const hasCompleteEvidence =
    event.lastReviewedAt !== undefined &&
    event.marketEvidence !== undefined &&
    event.criteria !== undefined &&
    sourceTypes.has('primary-policy') &&
    sourceTypes.has('market-data') &&
    sourceTypes.has('reporting')
  if (!hasCompleteEvidence) {
    context.addIssue({
      code: 'custom',
      path: ['confidence'],
      message: '高信心事件必須包含完整政策、市場、同期報導來源與審閱資料',
    })
  }
})

export const eventCandidateSchema = eventBaseSchema.extend({
  reviewStatus: z.enum(['draft', 'in-review', 'approved']),
  lastReviewedAt: z.string().date(),
  marketEvidence: eventMarketEvidenceSchema.nullable(),
  criteria: eventCriteriaSchema,
  sources: z.array(eventSourceSchema.extend({ type: eventSourceTypeSchema })),
})

export const eventsDataSchema = z.array(eventSchema)
export const eventCandidatesDataSchema = z.array(eventCandidateSchema)

export type LatestData = z.infer<typeof latestDataSchema>
export type HistoryItem = z.infer<typeof historyItemSchema>
export type TacoEvent = z.infer<typeof eventSchema>
export type TacoEventCandidate = z.infer<typeof eventCandidateSchema>
