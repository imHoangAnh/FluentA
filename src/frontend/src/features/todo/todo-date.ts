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
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day))
}
