export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const APP_UTC_OFFSET_MINUTES = 420

const MILLISECONDS_PER_DAY = 86_400_000

type DateOnlyParts = {
  year: number
  month: number
  day: number
}

function partsFor(date: Date, timeZone = APP_TIME_ZONE): DateOnlyParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function createUtcDate({ year, month, day }: DateOnlyParts, hour = 0, minute = 0) {
  const date = new Date(0)
  date.setUTCHours(hour, minute, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

function parseDateOnly(value: string): DateOnlyParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const date = createUtcDate(parts)
  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day
    ? parts
    : null
}

export function todayInAppTimeZone(now = new Date()) {
  const { year, month, day } = partsFor(now)
  return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
}

export function appHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  return Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
}

/** Format an instant in the application's Vietnam wall clock. */
export function formatVietnamTimestamp(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: APP_TIME_ZONE }).format(date)
}

/** Format a date-only value without interpreting it in the browser timezone. */
export function formatVietnamDateOnly(value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  const parts = parseDateOnly(value.slice(0, 10))
  if (!parts) return value
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(createUtcDate(parts, 12))
}

export function formatVietnamTime(value: string | Date) {
  return formatVietnamTimestamp(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function addCalendarDays(value: string, days: number) {
  const parts = parseDateOnly(value)
  if (!parts) return value
  const shifted = new Date(createUtcDate(parts, 12).getTime() + days * MILLISECONDS_PER_DAY)
  return `${shifted.getUTCFullYear()}-${`${shifted.getUTCMonth() + 1}`.padStart(2, '0')}-${`${shifted.getUTCDate()}`.padStart(2, '0')}`
}

export function differenceInCalendarDays(later: string, earlier: string) {
  const laterParts = parseDateOnly(later)
  const earlierParts = parseDateOnly(earlier)
  if (!laterParts || !earlierParts) return Number.NaN
  return Math.round((createUtcDate(laterParts, 12).getTime() - createUtcDate(earlierParts, 12).getTime()) / MILLISECONDS_PER_DAY)
}

/** Convert Vietnam wall-clock input to an absolute UTC instant without host TZ APIs. */
export function vietnamWallClockToUtc(dateValue: string, timeValue: string): Date | null {
  const dateParts = parseDateOnly(dateValue)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue)
  if (!dateParts || !timeMatch) return null

  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59) return null

  const vietnamWallClockMs = createUtcDate(dateParts, hour, minute).getTime()
  const utc = new Date(vietnamWallClockMs - APP_UTC_OFFSET_MINUTES * 60_000)
  const expected = partsFor(utc)
  return expected.year === dateParts.year
    && expected.month === dateParts.month
    && expected.day === dateParts.day
    ? utc
    : null
}

export function vietnamDateOnlyToUtc(value: string) {
  const parts = parseDateOnly(value)
  if (!parts) return null
  return new Date(createUtcDate(parts).getTime() - APP_UTC_OFFSET_MINUTES * 60_000)
}
