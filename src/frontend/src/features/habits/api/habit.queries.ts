export const habitKeys = {
  all: ['habit'] as const,
  list: (month?: string) => month
    ? ['habit', 'list', month] as const
    : ['habit', 'list'] as const,
  entries: (habitId: string, month: string) => ['habit', 'entries', habitId, month] as const,
}
