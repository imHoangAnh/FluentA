import { describe, expect, it } from 'vitest'
import {
  computeTaskMinutes,
  formatDayGroupHeading,
  formatDetailDate,
  formatMyDaySubtitleDate,
  formatScheduledDuration,
  formatShortDate,
  formatWeekRange,
  formatWeekShortRange,
  formatWeekday,
  weekDates,
  weekStart,
} from './todo-date'

describe('Todo week dates and formatting', () => {
  it('keeps Monday as the first day of the week', () => {
    expect(weekStart('2026-07-22')).toBe('2026-07-20')
    expect(weekDates('2026-07-22')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ])
  })

  it('shows only the weekday name on a column', () => {
    expect(formatWeekday('2026-07-20')).toBe('Monday')
  })

  it.each([
    ['2026-07-20', '2026-07-26', 'July 20\u201326, 2026'],
    ['2026-07-27', '2026-08-02', 'July 27\u2013August 2, 2026'],
    ['2025-12-29', '2026-01-04', 'December 29, 2025\u2013January 4, 2026'],
  ])('formats %s through %s as %s', (start, end, expected) => {
    expect(formatWeekRange(start, end)).toBe(expected)
  })

  it('formats Figma subtitles, strip headers, and scheduled durations', () => {
    expect(formatMyDaySubtitleDate('2026-11-24')).toBe('Tuesday, Nov 24')
    expect(formatShortDate('2026-11-24')).toBe('Tue, Nov 24')
    expect(formatDetailDate('2026-11-24', '2026-11-24')).toBe('Today, Nov 24')
    expect(formatDetailDate('2026-11-25', '2026-11-24')).toBe('Tomorrow, Nov 25')
    expect(formatWeekShortRange('2026-11-23', '2026-11-29')).toBe('Nov 23 \u2013 Nov 29, 2026')
    expect(formatDayGroupHeading('2026-11-24', '2026-11-24')).toBe('TODAY  \u2022  TUESDAY, NOV 24')
    expect(formatDayGroupHeading('2026-11-25', '2026-11-24')).toBe('WEDNESDAY, NOV 25')
    expect(formatScheduledDuration(175)).toBe('2h 55m')
    expect(formatScheduledDuration(45)).toBe('45m')
    expect(formatScheduledDuration(0)).toBe('')
    expect(computeTaskMinutes({ estimatedMinutes: null, scheduledStartTime: '09:00', scheduledEndTime: '10:30' })).toBe(90)
  })
})
