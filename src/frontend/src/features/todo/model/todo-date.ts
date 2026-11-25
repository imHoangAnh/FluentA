import { formatDateOnly } from '@/shared/lib/date'
import type { TodoItem } from '../api/todo.api'

function parseDateParts(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return { year, month, day }
}

function formatEnUs(dateValue: string, options: Intl.DateTimeFormatOptions) {
  const { year, month, day } = parseDateParts(dateValue)
  if (!year || !month || !day) return dateValue
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(utc)
}

export function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftDate(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toDateInput(date)
}

export function weekStart(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toDateInput(date)
}

export function weekDates(dateValue: string) {
  const start = weekStart(dateValue)
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index))
}

export function formatMyDayDate(dateValue: string) {
  return formatDateOnly(dateValue, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatMyDaySubtitleDate(dateValue: string) {
  const weekday = formatEnUs(dateValue, { weekday: 'long' })
  const monthDay = formatEnUs(dateValue, { month: 'short', day: 'numeric' })
  return `${weekday}, ${monthDay}`
}

export function formatShortDate(dateValue: string) {
  const weekday = formatEnUs(dateValue, { weekday: 'short' })
  const monthDay = formatEnUs(dateValue, { month: 'short', day: 'numeric' })
  return `${weekday}, ${monthDay}`
}

export function formatDetailDate(dateValue: string, today: string) {
  const monthDay = formatEnUs(dateValue, { month: 'short', day: 'numeric' })
  if (dateValue === today) return `Today, ${monthDay}`
  if (dateValue === shiftDate(today, 1)) return `Tomorrow, ${monthDay}`
  const weekday = formatEnUs(dateValue, { weekday: 'short' })
  return `${weekday}, ${monthDay}`
}

export function formatWeekday(dateValue: string) {
  return formatDateOnly(dateValue, { weekday: 'long' })
}

export function formatShortWeekday(dateValue: string) {
  return formatEnUs(dateValue, { weekday: 'short' })
}

export function getDayNumber(dateValue: string) {
  return `${Number(dateValue.slice(8, 10))}`
}

export function formatWeekRange(startDateValue: string, endDateValue: string) {
  const startParts = startDateValue.split('-').map(Number)
  const endParts = endDateValue.split('-').map(Number)
  const start = { year: startParts[0], month: startParts[1], day: startParts[2] }
  const end = { year: endParts[0], month: endParts[1], day: endParts[2] }
  const month = (value: string) => formatDateOnly(value, { month: 'long' })

  if (start.year === end.year && start.month === end.month) {
    return `${month(startDateValue)} ${start.day}\u2013${end.day}, ${end.year}`
  }

  if (start.year === end.year) {
    return `${month(startDateValue)} ${start.day}\u2013${month(endDateValue)} ${end.day}, ${end.year}`
  }

  return `${month(startDateValue)} ${start.day}, ${start.year}\u2013${month(endDateValue)} ${end.day}, ${end.year}`
}

export function formatWeekShortRange(startDateValue: string, endDateValue: string) {
  const startLabel = formatEnUs(startDateValue, { month: 'short', day: 'numeric' })
  const endLabel = formatEnUs(endDateValue, { month: 'short', day: 'numeric' })
  const startYear = startDateValue.slice(0, 4)
  const endYear = endDateValue.slice(0, 4)
  if (startYear === endYear) {
    return `${startLabel} \u2013 ${endLabel}, ${endYear}`
  }
  return `${startLabel}, ${startYear} \u2013 ${endLabel}, ${endYear}`
}

export function formatDayGroupHeading(dateValue: string, today: string) {
  const weekday = formatEnUs(dateValue, { weekday: 'long' }).toUpperCase()
  const monthDay = formatEnUs(dateValue, { month: 'short', day: 'numeric' }).toUpperCase()
  return dateValue === today ? `TODAY  \u2022  ${weekday}, ${monthDay}` : `${weekday}, ${monthDay}`
}

export function parseTimeToMinutes(value?: string | null) {
  if (!value) return null
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function computeTaskMinutes(item: Pick<TodoItem, 'estimatedMinutes' | 'scheduledStartTime' | 'scheduledEndTime'>) {
  if (typeof item.estimatedMinutes === 'number' && item.estimatedMinutes > 0) {
    return item.estimatedMinutes
  }
  const start = parseTimeToMinutes(item.scheduledStartTime)
  const end = parseTimeToMinutes(item.scheduledEndTime)
  if (start !== null && end !== null && end > start) {
    return end - start
  }
  return 0
}

export function formatScheduledDuration(totalMinutes: number) {
  if (totalMinutes <= 0) return ''
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}
