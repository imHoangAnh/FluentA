import type { Habit } from '../api/habit.api'

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toMonthInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function parseMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function startOfWeek(date: Date) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function shiftWeek(value: string, weeks: number) {
  const date = parseDateInput(value)
  date.setDate(date.getDate() + weeks * 7)
  return toDateInput(date)
}

export function shiftMonth(value: string, months: number) {
  const date = parseMonth(value)
  date.setMonth(date.getMonth() + months)
  return toMonthInput(date)
}

export function monthDates(value: string) {
  const start = parseMonth(value)
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const dates: string[] = []
  for (const cursor = new Date(start); cursor < next; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toDateInput(cursor))
  }
  return dates
}

export function dayOfWeek(value: string) {
  return weekdays[parseDateInput(value).getDay()]
}

export function formatMonth(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(parseMonth(value))
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDateInput(value))
}

export function isScheduled(habit: Habit, date: string) {
  return habit.frequency === 'Daily' || habit.customDays.includes(dayOfWeek(date))
}

export function isAggregateEligible(habit: Habit, date: string) {
  return date >= habit.startDate
    && isScheduled(habit, date)
    && (!habit.goalCompletedOn || date <= habit.goalCompletedOn)
}

export function canToggleHabit(habit: Habit, date: string, today: string, isCompleted: boolean) {
  if (isCompleted) return true
  return date <= today
    && date >= habit.startDate
    && isScheduled(habit, date)
    && !habit.isGoalCompleted
}

export function scheduleText(habit: Habit) {
  return habit.frequency === 'Daily' ? 'Daily' : habit.customDays.join(', ')
}
