import { describe, expect, it } from 'vitest'
import { createBrowserReminder } from './todo-reminder'

describe('createBrowserReminder', () => {
  it('returns the exact browser-resolved UTC instant and timezone', () => {
    const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone
    const expectedInstant = new Date(2035, 6, 22, 10, 30, 0, 0).toISOString()
    const result = createBrowserReminder('2035-07-22', '10:30', new Date(2035, 6, 21).getTime(), timeZoneId)

    expect(result).toEqual({
      reminder: {
        time: '10:30',
        timeZoneId,
        scheduledAtUtc: expectedInstant,
      },
    })
  })

  it('rejects empty, invalid, and past values', () => {
    const now = new Date('2035-07-22T10:30:00Z').getTime()

    expect(createBrowserReminder('2035-07-22', '', now, 'UTC')).toEqual({ error: 'Choose a reminder time.' })
    expect(createBrowserReminder('2035-07-22', '24:00', now, 'UTC')).toEqual({ error: 'Choose a valid reminder time.' })
    expect(createBrowserReminder('2035-07-22', '10:30', now, 'UTC')).toEqual({ error: 'Choose a future reminder time.' })
  })
})
