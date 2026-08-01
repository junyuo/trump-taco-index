import { describe, expect, it } from 'vitest'
import { evaluateScheduleStability, type WorkflowRun } from './check-schedule-stability'

const latestTime = Date.parse('2026-08-01T00:17:00Z')

function run(
  index: number,
  overrides: Partial<WorkflowRun> = {},
): WorkflowRun {
  return {
    databaseId: index + 1,
    createdAt: new Date(latestTime - index * 6 * 60 * 60 * 1000).toISOString(),
    conclusion: 'success',
    status: 'completed',
    url: `https://github.com/example/repository/actions/runs/${index + 1}`,
    event: 'schedule',
    ...overrides,
  }
}

describe('scheduled update stability gate', () => {
  it('rejects 24 successful runs that do not span seven days', () => {
    const result = evaluateScheduleStability(Array.from({ length: 24 }, (_, index) => run(index)))
    expect(result.passed).toBe(false)
    expect(result.successCount).toBe(24)
    expect(result.spanDays).toBeLessThan(7)
  })

  it('accepts a consecutive successful sequence spanning at least seven days', () => {
    const result = evaluateScheduleStability(Array.from({ length: 29 }, (_, index) => run(index)))
    expect(result.passed).toBe(true)
    expect(result.successCount).toBe(29)
    expect(result.spanDays).toBe(7)
  })

  it.each(['failure', 'cancelled', 'skipped'])('resets at a %s scheduled run', (conclusion) => {
    const runs = Array.from({ length: 40 }, (_, index) =>
      index === 10 ? run(index, { conclusion }) : run(index),
    )
    const result = evaluateScheduleStability(runs)
    expect(result.passed).toBe(false)
    expect(result.successCount).toBe(10)
    expect(result.blockingRunUrl).toContain('/11')
  })

  it('ignores manually dispatched runs', () => {
    const scheduled = Array.from({ length: 29 }, (_, index) => run(index))
    const manual = run(50, { event: 'workflow_dispatch', conclusion: 'failure' })
    expect(evaluateScheduleStability([manual, ...scheduled]).passed).toBe(true)
  })

  it('fails closed when the GitHub response is malformed', () => {
    expect(() => evaluateScheduleStability([{ event: 'schedule' }])).toThrow()
  })
})
