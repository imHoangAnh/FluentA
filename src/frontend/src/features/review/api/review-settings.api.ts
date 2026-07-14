import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type ReviewSettings = {
  dailyLimit: number
  recapAfterAnswer: boolean
}

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

export async function getReviewSettings() {
  const response = await apiClient.get<ApiEnvelope<ReviewSettings>>('/review/settings')
  return response.data.data!
}

export async function updateReviewSettings(input: ReviewSettings) {
  const response = await apiClient.put<ApiEnvelope<ReviewSettings>>('/review/settings', input)
  return response.data.data!
}

export async function listLevelFiveWords() {
  const response = await apiClient.get<ApiEnvelope<LevelFiveReviewItem[]>>('/review/level-five')
  return response.data.data ?? []
}

export async function removeLevelFiveWords(wordIds: string[]) {
  const response = await apiClient.post<ApiEnvelope<number>>('/review/level-five/remove', { wordIds })
  return response.data.data ?? 0
}
