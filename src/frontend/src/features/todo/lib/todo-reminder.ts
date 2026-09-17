import type { TodoReminderInput } from '../api/todo.api'
import { APP_TIME_ZONE, vietnamWallClockToUtc } from '@/shared/lib/timezone'

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const timePattern = /^(\d{2}):(\d{2})$/

export type BrowserReminderResult =
  | { reminder: TodoReminderInput; error?: never }
  | { reminder?: never; error: string }

export function createBrowserReminder(
  taskDate: string,
  time: string,
  nowMs = Date.now(),
  // Keep the optional argument for callers compiled against the old helper; the
  // product policy is Vietnam-only, so it is intentionally ignored.
  legacyTimeZoneId?: string,
): BrowserReminderResult {
  // The legacy browser timezone argument remains accepted for source compatibility.
  void legacyTimeZoneId
  const dateMatch = datePattern.exec(taskDate)
  const timeMatch = timePattern.exec(time)
  if (!dateMatch || !timeMatch) return { error: 'Choose a reminder time.' }

  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59) return { error: 'Choose a valid reminder time.' }

  const utc = vietnamWallClockToUtc(taskDate, time)
  if (!utc) return { error: 'That time does not exist in the Vietnam timezone.' }

  if (utc.getTime() <= nowMs) return { error: 'Choose a future reminder time.' }

  return {
    reminder: {
      time,
      timeZoneId: APP_TIME_ZONE,
      scheduledAtUtc: utc.toISOString(),
    },
  }
}
