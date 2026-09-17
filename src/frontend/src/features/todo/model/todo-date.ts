import { formatVietnamDateOnly } from '@/shared/lib/timezone'

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
  return formatVietnamDateOnly(dateValue, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatWeekday(dateValue: string) {
  return formatVietnamDateOnly(dateValue, { weekday: 'long' })
}

export function formatWeekRange(startDateValue: string, endDateValue: string) {
  const startParts = startDateValue.split('-').map(Number)
  const endParts = endDateValue.split('-').map(Number)
  const start = { year: startParts[0], month: startParts[1], day: startParts[2] }
  const end = { year: endParts[0], month: endParts[1], day: endParts[2] }
  const month = (value: string) => formatVietnamDateOnly(value, { month: 'long' })

  if (start.year === end.year && start.month === end.month) {
    return `${month(startDateValue)} ${start.day}\u2013${end.day}, ${end.year}`
  }

  if (start.year === end.year) {
    return `${month(startDateValue)} ${start.day}\u2013${month(endDateValue)} ${end.day}, ${end.year}`
  }

  return `${month(startDateValue)} ${start.day}, ${start.year}\u2013${month(endDateValue)} ${end.day}, ${end.year}`
}
