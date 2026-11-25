export type TimeValue = {
  hour: number
  minute: number
  second?: number
}

export function parseTimeValue(value: string | null | undefined): TimeValue | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = match[3] ? Number(match[3]) : 0
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null
  }
  return { hour, minute, second }
}

export function formatTimeValue(time: TimeValue): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
}

export function toTotalMinutes(value: string | null | undefined): number | null {
  const parsed = parseTimeValue(value)
  return parsed ? parsed.hour * 60 + parsed.minute : null
}
