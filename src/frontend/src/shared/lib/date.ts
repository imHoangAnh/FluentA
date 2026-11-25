const MILLISECONDS_PER_DAY = 86_400_000

type DateOnlyParts = {
  year: number
  month: number
  day: number
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

export function todayUtc(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${now.getUTCDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function utcHour(now = new Date()) {
  return now.getUTCHours()
}

/** Format a date-only value (YYYY-MM-DD) without shifting by local browser timezone. */
export function formatDateOnly(
  value: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const parts = parseDateOnly(value.slice(0, 10))
  if (!parts) return value
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(createUtcDate(parts, 12))
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
