export const habitKeys = {
  all: ['habit'] as const,
  list: (timeZoneId: string, month?: string) => month
    ? ['habit', 'list', timeZoneId, month] as const
    : ['habit', 'list', timeZoneId] as const,
  entries: (habitId: string, month: string, timeZoneId: string) => ['habit', 'entries', habitId, month, timeZoneId] as const,
}
