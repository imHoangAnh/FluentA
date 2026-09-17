import { describe, expect, it } from 'vitest'
import { addCalendarDays, differenceInCalendarDays, todayInAppTimeZone, vietnamWallClockToUtc } from './timezone'

describe('Vietnam application timezone', () => {
  it('uses the Vietnam date at the UTC day boundary regardless of host timezone', () => {
    expect(todayInAppTimeZone(new Date('2035-07-21T16:59:59.000Z'))).toBe('2035-07-21')
    expect(todayInAppTimeZone(new Date('2035-07-21T17:00:00.000Z'))).toBe('2035-07-22')
  })

  it('converts Vietnam wall-clock input to one stable UTC instant', () => {
    expect(vietnamWallClockToUtc('2035-07-22', '00:00')?.toISOString()).toBe('2035-07-21T17:00:00.000Z')
    expect(vietnamWallClockToUtc('2035-07-22', '23:59')?.toISOString()).toBe('2035-07-22T16:59:00.000Z')
    expect(vietnamWallClockToUtc('2035-02-30', '10:00')).toBeNull()
  })

  it('keeps date-only calendar arithmetic independent from instants', () => {
    expect(addCalendarDays('2035-12-31', 1)).toBe('2036-01-01')
    expect(differenceInCalendarDays('2036-01-01', '2035-12-31')).toBe(1)
  })
})
