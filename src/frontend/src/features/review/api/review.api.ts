import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type ReviewMode = 'meaningToWord'
export type ReviewSessionStatus = string
export type ReviewItemResult = string | null

export type ReviewSessionItem = {
  itemId: string
  wordId: string
  position: number
  mode: ReviewMode
  language: string
  word: string
  meaning: string | null
  ipaPronunciation: string | null
  type: string | null
  context: string | null
  example: string | null
  synonyms: string | null
  antonyms: string | null
  isReviewed: boolean
  result: ReviewItemResult
  levelBefore: number | null
  levelAfter: number | null
  nextReviewDateBefore: string | null
  nextReviewDateAfter: string | null
}

export type ReviewSession = {
  sessionId: string
  localDate: string
  startedAt: string
  completedAt: string | null
  status: ReviewSessionStatus
  totalWords: number
  completedWords: number
  currentItemIndex: number | null
  items: ReviewSessionItem[]
}

export type ReviewDashboardPreviewWord = {
  wordId: string
  word: string
  ipaPronunciation: string
}

export type ReviewDashboard = {
  localDate: string
  dueCount: number
  previewWords?: ReviewDashboardPreviewWord[]
}

export type ReviewAnswerResult = {
  itemId: string
  wordId: string
  correct: boolean
  isReviewed: boolean
  result: string | null
  levelBefore: number | null
  levelAfter: number | null
  nextReviewDateBefore: string | null
  nextReviewDateAfter: string | null
  completedWords: number
  currentItemIndex: number | null
  sessionStatus: ReviewSessionStatus
}

export async function getReviewDashboard() {
  const response = await apiClient.get<ApiResponse<ReviewDashboard>>('/review/dashboard')
  return response.data.data!
}

export async function createReviewSession() {
  const response = await apiClient.post<ApiResponse<ReviewSession>>('/review/sessions')
  return response.data.data!
}

export async function getReviewSession(sessionId: string) {
  const response = await apiClient.get<ApiResponse<ReviewSession>>(`/review/sessions/${sessionId}`)
  return response.data.data!
}

export async function submitReviewAnswer(input: {
  sessionId: string
  itemId: string
  answerText: string
  timeSpentSeconds: number
}) {
  const { sessionId, ...body } = input
  const response = await apiClient.post<ApiResponse<ReviewAnswerResult>>(
    `/review/sessions/${sessionId}/answers`,
    body,
  )
  return response.data.data!
}
