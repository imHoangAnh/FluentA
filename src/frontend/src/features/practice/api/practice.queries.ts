export const practiceKeys = {
  all: ['practice'] as const,
  decks: (input: { boardId: string; search: string; page: number; pageSize: number }) => ['practice', 'decks', input] as const,
  session: (sessionId: string) => ['practice', 'sessions', sessionId] as const,
}
