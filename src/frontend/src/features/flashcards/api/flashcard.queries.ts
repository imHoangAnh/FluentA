export const flashcardKeys = {
  all: ['flashcard'] as const,
  boards: ['flashcard', 'boards'] as const,
  decks: ['flashcard', 'decks'] as const,
  pageSession: (pageId: string) => ['flashcard', 'page-session', pageId] as const,
}
