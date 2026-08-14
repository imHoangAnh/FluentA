export const noteKeys = {
  all: ['note'] as const,
  boards: ['note', 'boards'] as const,
  page: (pageId?: string | null) => ['note', 'page', pageId] as const,
}
