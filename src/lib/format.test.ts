import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatObservationDate } from './format'

describe('date formatting', () => {
  it('shows a shared observation basis as a date without a synthetic time', () => {
    const formatted = formatObservationDate('2026-07-19T00:00:00Z')
    expect(formatted).toBe(formatDate('2026-07-19'))
    expect(formatted).not.toMatch(/上午|下午|:/)
  })

  it('keeps the successful fetch as an Asia/Taipei timestamp', () => {
    const formatted = formatDateTime('2026-07-27T05:38:35Z')
    expect(formatted).toMatch(/2026/)
    expect(formatted).toMatch(/下午|13:38/)
  })
})
