export const vocabularyKeys = {
  all: ['vocab'] as const,
  boards: ['vocab', 'boards'] as const,
  board: (boardId?: string | null) => ['vocab', 'boards', boardId] as const,
  words: (pageId: string) => ['vocab', 'words', pageId] as const,
}
