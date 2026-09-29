import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { PronunciationAssessment } from '@/features/pronunciation'

export type ReviewMode = 'dictation' | 'meaningToWord' | 'listenAndRepeat'
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
  pronunciationAttemptCount: number
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

export type ReviewDashboard = {
  localDate: string
  dueCount: number
}

export type ReviewAnswerResult = {
  itemId: string
  wordId: string
  correct: boolean
  isReviewed: boolean
  attemptsUsed: number
  attemptsRemaining: number
  result: string | null
  levelBefore: number | null
  levelAfter: number | null
  nextReviewDateBefore: string | null
  nextReviewDateAfter: string | null
  completedWords: number
  currentItemIndex: number | null
  sessionStatus: ReviewSessionStatus
  assessment: PronunciationAssessment | null
}

export type ReviewPronunciationResult = ReviewAnswerResult

export async function getReviewDashboard(timeZoneId: string) {
  const response = await apiClient.get<ApiEnvelope<ReviewDashboard>>('/review/dashboard', {
    params: { timeZoneId },
  })
  return response.data.data!
}

export async function createReviewSession(input: { timeZoneId: string }) {
  const response = await apiClient.post<ApiEnvelope<ReviewSession>>('/review/sessions', input)
  return response.data.data!
}

export async function getReviewSession(sessionId: string) {
  const response = await apiClient.get<ApiEnvelope<ReviewSession>>(`/review/sessions/${sessionId}`)
  return response.data.data!
}

export async function submitReviewAnswer(input: {
  sessionId: string
  itemId: string
  answerText: string
  timeSpentSeconds: number
}) {
  const { sessionId, ...body } = input
  const response = await apiClient.post<ApiEnvelope<ReviewAnswerResult>>(
    `/review/sessions/${sessionId}/answers`,
    body,
  )
  return response.data.data!
}

export async function submitReviewPronunciation(input: {
  sessionId: string
  itemId: string
  audio: Blob
  timeSpentSeconds: number
}) {
  const form = new FormData()
  form.append('itemId', input.itemId)
  form.append('audio', input.audio, 'review-pronunciation.wav')
  form.append('timeSpentSeconds', String(input.timeSpentSeconds))

  const response = await apiClient.post<ApiEnvelope<ReviewPronunciationResult>>(
    `/review/sessions/${input.sessionId}/pronunciation-attempts`,
    form,
  )
  return response.data.data!
}
