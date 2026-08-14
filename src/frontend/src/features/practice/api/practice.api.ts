import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'

export type PracticeMode = 'dictation' | 'meaningToWord' | 'pronunciation'

export type PracticeSettings = {
  modeSequence: PracticeMode[]
}

export type PracticeSessionSummary = {
  id: string
  userId: string
  pageId: string
  mode: PracticeMode
  totalCards: number
  correctCards: number
  wrongCards: number
  completedAt: string
}

export type AddPracticeWordsToReviewResult = {
  pageId: string
  wordId: string
  status: 'added' | 'alreadyInReview'
  nextReviewDate: string
}

export async function getPracticeSettings() {
  const response = await apiClient.get<ApiEnvelope<PracticeSettings>>('/practice/settings')
  return response.data.data!
}

export async function updatePracticeSettings(input: PracticeSettings) {
  const response = await apiClient.put<ApiEnvelope<PracticeSettings>>('/practice/settings', input)
  return response.data.data!
}

export async function createPracticeSessionSummary(input: { pageId: string; mode: PracticeMode; totalCards: number; correctCards: number; wrongCards: number; timeZoneId: string }) {
  const response = await apiClient.post<ApiEnvelope<PracticeSessionSummary>>('/practice/sessions', input)
  return response.data.data!
}

export async function addPracticeWordsToReview(input: { pageId: string; wordId: string; timeZoneId: string }) {
  const response = await apiClient.post<ApiEnvelope<AddPracticeWordsToReviewResult>>('/practice/add-to-review', input)
  return response.data.data!
}
