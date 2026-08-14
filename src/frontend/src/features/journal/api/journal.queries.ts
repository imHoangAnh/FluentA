export const journalKeys = {
  all: ['journal'] as const,
  entries: ['journal', 'entries'] as const,
  search: (query: string) => ['journal', 'search', query] as const,
  calendar: (month: string) => ['journal', 'calendar', month] as const,
  entry: (entryId: string) => ['journal', 'entry', entryId] as const,
}
