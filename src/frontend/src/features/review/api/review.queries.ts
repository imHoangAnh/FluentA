export const reviewKeys = {
  all: ['review'] as const,
  dashboard: ['review', 'dashboard'] as const,
  session: (sessionId: string) => ['review', 'session', sessionId] as const,
}
