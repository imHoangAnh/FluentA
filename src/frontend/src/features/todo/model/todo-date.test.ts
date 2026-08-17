import { describe, expect, it } from 'vitest'
import { formatWeekRange, formatWeekday, weekDates, weekStart } from './todo-date'

describe('Todo week dates', () => {
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
})
