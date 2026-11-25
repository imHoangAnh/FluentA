import { describe, expect, it } from 'vitest'
import { addCalendarDays, differenceInCalendarDays, formatDateOnly, todayUtc, utcHour } from './date'

describe('date UTC helpers', () => {
  it('computes todayUtc and utcHour strictly in UTC', () => {
    const instant = new Date('2026-11-23T23:30:00Z')
    expect(todayUtc(instant)).toBe('2026-11-23')
    expect(utcHour(instant)).toBe(23)

    const midnight = new Date('2026-11-24T00:15:00Z')
    expect(todayUtc(midnight)).toBe('2026-11-24')
    expect(utcHour(midnight)).toBe(0)
  })

  it('adds and diffs calendar days without timezone drift', () => {
    expect(addCalendarDays('2026-11-23', 7)).toBe('2026-11-30')
    expect(differenceInCalendarDays('2026-11-30', '2026-11-23')).toBe(7)
  })

  it('formats YYYY-MM-DD date-only strings deterministically in UTC', () => {
    expect(formatDateOnly('2026-11-23', { month: 'short', day: 'numeric', year: 'numeric' })).toContain('23')
  })
})
