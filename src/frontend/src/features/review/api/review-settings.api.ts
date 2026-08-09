import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'
import type { TrashEntry } from '@/features/trash'

export type LevelFiveReviewItem = {
  wordId: string
  word: string
  boardId: string
  boardName: string
  pageId: string
  pageName: string
  status: 'active' | 'inactive'
  lastReviewDate?: string | null
}

export async function listLevelFiveWords() {
  const response = await apiClient.get<ApiEnvelope<LevelFiveReviewItem[]>>('/review/level-five')
  return response.data.data ?? []
}

export async function removeLevelFiveWords(wordIds: string[]) {
  const response = await apiClient.post<ApiEnvelope<TrashEntry[]>>('/review/level-five/remove', { wordIds })
  return response.data.data ?? []
}
