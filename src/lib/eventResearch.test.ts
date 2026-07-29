import { describe, expect, it } from 'vitest'
import {
  calculateDaysToPivot,
  deriveEventClassification,
  deriveEventConfidence,
  prepareApprovedEvent,
} from './eventResearch'
import type { TacoEventCandidate } from '../types/data'

function candidateFixture(): TacoEventCandidate {
  return {
    id: 'event-fixture',
    reviewStatus: 'approved',
    threatDate: '2025-04-02',
    pivotDate: '2025-04-09',
    category: 'tariff',
    title: '事件測試',
    threatSummary: '政策威脅',
    pivotSummary: '政策調整',
    marketReaction: '市場壓力上升',
    daysToPivot: 999,
    tacoClassification: 'pending',
    confidence: 'low',
    lastReviewedAt: '2026-07-29',
    marketEvidence: {
      baselineDate: '2025-04-01',
      peakDate: '2025-04-08',
      baselineScore: 30,
      peakScore: 45,
      scoreChange: 15,
      leadingIndicators: ['sp500'],
    },
    criteria: {
      threatConfirmed: true,
      pivotConfirmed: true,
      marketStressObserved: true,
      timingAligned: true,
      contemporaneousLink: true,
    },
    sources: [
      {
        type: 'primary-policy',
        title: '政策一',
        publisher: '官方',
        date: '2025-04-02',
        url: 'https://example.com/policy-1',
      },
      {
        type: 'primary-policy',
        title: '政策二',
        publisher: '官方',
        date: '2025-04-09',
        url: 'https://example.com/policy-2',
      },
      {
        type: 'market-data',
        title: '市場資料',
        publisher: '資料來源',
        date: '2025-04-09',
        url: 'https://example.com/market',
      },
      {
        type: 'reporting',
        title: '同期報導',
        publisher: '媒體',
        date: '2025-04-09',
        url: 'https://example.com/report',
      },
    ],
  }
}

describe('event research rules', () => {
  it('calculates days to pivot and rejects reversed dates', () => {
    expect(calculateDaysToPivot('2025-04-02', '2025-04-09')).toBe(7)
    expect(calculateDaysToPivot('2025-04-02', null)).toBeNull()
    expect(() => calculateDaysToPivot('2025-04-09', '2025-04-02')).toThrow()
  })

  it('derives classifications from explicit criteria', () => {
    const candidate = candidateFixture()
    expect(deriveEventClassification(candidate.criteria, 7)).toBe('likely')
    expect(
      deriveEventClassification(
        { ...candidate.criteria, contemporaneousLink: false },
        7,
      ),
    ).toBe('possible')
    expect(
      deriveEventClassification(
        { ...candidate.criteria, pivotConfirmed: false },
        null,
      ),
    ).toBe('pending')
  })

  it('derives confidence and recalculates publish fields', () => {
    const candidate = candidateFixture()
    expect(deriveEventConfidence(candidate)).toBe('medium')
    const event = prepareApprovedEvent(candidate)
    expect(event.daysToPivot).toBe(7)
    expect(event.tacoClassification).toBe('likely')
    expect(event.confidence).toBe('medium')
    expect(event).not.toHaveProperty('reviewStatus')
  })

  it('refuses to publish unapproved or incomplete research', () => {
    const draft = { ...candidateFixture(), reviewStatus: 'draft' as const }
    expect(() => prepareApprovedEvent(draft)).toThrow('尚未通過人工審核')

    const incomplete = { ...candidateFixture(), marketEvidence: null }
    expect(() => prepareApprovedEvent(incomplete)).toThrow('缺少可重算的市場證據')
  })
})
