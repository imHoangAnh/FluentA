import { describe, expect, it } from 'vitest'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'
import { createBrowserReminder } from './todo-reminder'

describe('createBrowserReminder', () => {
  it('converts Vietnam wall-clock time to the same UTC instant on every host timezone', () => {
    const result = createBrowserReminder('2035-07-22', '10:30', new Date('2035-07-22T00:00:00Z').getTime(), 'UTC')

    expect(result).toEqual({
      reminder: {
        time: '10:30',
        timeZoneId: APP_TIME_ZONE,
        scheduledAtUtc: '2035-07-22T03:30:00.000Z',
      },
    })
  })

  it('rejects empty, invalid, and past values', () => {
    const now = new Date('2035-07-22T10:30:00Z').getTime()

    expect(createBrowserReminder('2035-07-22', '', now, 'UTC')).toEqual({ error: 'Choose a reminder time.' })
    expect(createBrowserReminder('2035-07-22', '24:00', now, 'UTC')).toEqual({ error: 'Choose a valid reminder time.' })
    expect(createBrowserReminder('2035-07-22', '10:30', now, 'UTC')).toEqual({ error: 'Choose a future reminder time.' })
    expect(createBrowserReminder('2035-02-30', '10:30', now)).toEqual({ error: 'That time does not exist in the Vietnam timezone.' })
  })
})
