import { z } from 'zod'

export const dataModeSchema = z.enum(['live', 'delayed', 'manual', 'demo'])
export const dataStatusSchema = z.enum(['realtime', 'delayed', 'manual', 'simulated'])

export const indicatorSchema = z.object({
  label: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  dailyChangePercent: z.number().finite(),
  zScore: z.number().finite(),
  pressureZ: z.number().finite().nonnegative(),
  weight: z.number().finite().min(0).max(1),
  contribution: z.number().finite().nonnegative(),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  asOfDate: z.string().date(),
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
  }),
  indicators: z.object({
    brent: indicatorSchema,
    us10y: indicatorSchema,
    hormuz: indicatorSchema,
    sp500: indicatorSchema,
  }),
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

export const eventSchema = z.object({
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

export const eventCandidateSchema = eventSchema.extend({
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
