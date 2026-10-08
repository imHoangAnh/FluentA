import type { QueryClient } from '@tanstack/react-query'
import { practiceKeys } from '@/features/practice/api/practice.queries'
import { reviewKeys } from '@/features/review/api/review.queries'

export const vocabularyKeys = {
  all: ['vocab'] as const,
  boards: ['vocab', 'boards'] as const,
  board: (boardId?: string | null) => ['vocab', 'boards', boardId] as const,
  words: (pageId: string) => ['vocab', 'words', pageId] as const,
}

export function refreshLearningAfterVocabularyDeletion(client: QueryClient) {
  // Clear saved recaps and refresh active observers after their source is hidden.
  void client.resetQueries({ queryKey: practiceKeys.all })
  void client.resetQueries({ queryKey: reviewKeys.all })
}
