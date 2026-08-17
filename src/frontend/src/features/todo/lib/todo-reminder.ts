import type { TodoReminderInput } from '../api/todo.api'

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const timePattern = /^(\d{2}):(\d{2})$/

export type BrowserReminderResult =
  | { reminder: TodoReminderInput; error?: never }
  | { reminder?: never; error: string }

export function createBrowserReminder(
  taskDate: string,
  time: string,
  nowMs = Date.now(),
  timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone,
): BrowserReminderResult {
  const dateMatch = datePattern.exec(taskDate)
  const timeMatch = timePattern.exec(time)
  if (!dateMatch || !timeMatch) return { error: 'Choose a reminder time.' }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59 || !timeZoneId) return { error: 'Choose a valid reminder time.' }

  const local = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    local.getFullYear() !== year
    || local.getMonth() !== month - 1
    || local.getDate() !== day
    || local.getHours() !== hour
    || local.getMinutes() !== minute
  ) {
    return { error: 'That time does not exist in your current timezone.' }
  }

  if (local.getTime() <= nowMs) return { error: 'Choose a future reminder time.' }

  return {
    reminder: {
      time,
      timeZoneId,
      scheduledAtUtc: local.toISOString(),
    },
  }
}
