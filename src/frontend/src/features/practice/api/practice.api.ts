import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { PronunciationAssessment } from '@/features/pronunciation'

export type PracticeStep = 'dictation' | 'wordToMeaning' | 'pronunciation' | 'recap'
export type PracticeAnswerStep = PracticeStep
export type PracticeSessionStatus = 'active' | 'completed'
export type PracticeReviewLevel = 0 | 1 | 2 | 3 | 4 | 5
export type PracticeReviewStatus = 'added' | 'alreadyInReview'

export type PracticeDeck = {
  pageId: string
  pageName: string
  boardId: string
  boardName: string
  wordCount: number
}

export type PracticeDeckPage = {
  items: PracticeDeck[]
  page: number
  pageSize: number
  totalCount: number
}

export type PracticeAnswerSlot = {
  slotId: string
  meaning: string | null
}

export type PracticeSessionItem = {
  itemId: string
  wordId: string
  position: number
  word: string
  meaning: string
  ipaPronunciation: string
  type: string
  context: string | null
  example: string
  synonyms: string | null
  antonyms: string | null
  currentStep: PracticeStep
  alreadyInReview: boolean
  answerSlots: PracticeAnswerSlot[]
  selectedLevel: PracticeReviewLevel | null
  isCompleted: boolean
}

export type PracticeSession = {
  sessionId: string
  pageId: string
  pageName: string
  boardId: string
  boardName: string
  boardLanguage: string
  status: PracticeSessionStatus
  currentItemIndex: number
  items: PracticeSessionItem[]
}

export type CreatePracticeSessionResult = PracticeSession

export type SubmitPracticeAnswerInput = {
  itemId: string
  step: PracticeAnswerStep
  answerText?: string
  answerSlotId?: string
  skip?: boolean
  durationMs?: number
}

export type SubmitPracticeAnswerResult = {
  itemId: string
  step: PracticeStep
  correctness: boolean
  canRetry: boolean
  nextStep: PracticeStep | null
  currentItemIndex: number
  status: PracticeSessionStatus
}

export type SubmitPracticePronunciationResult = {
  itemId: string
  assessment: PronunciationAssessment
  isCorrect: boolean
  attemptNumber: number
  attemptsRemaining: number | null
  nextStep: PracticeStep | null
  currentItemIndex: number
  status: PracticeSessionStatus
}

export type SetPracticeReviewLevelResult = {
  status: PracticeReviewStatus
  itemCompleted: boolean
  currentItemIndex: number
}

export async function getPracticeDecks(input: {
  boardId: string
  search?: string
  page: number
  pageSize: number
}) {
  const response = await apiClient.get<ApiEnvelope<PracticeDeckPage>>('/practice/decks', { params: input })
  return response.data.data!
}

export async function createPracticeSession(input: { pageId: string }) {
  const response = await apiClient.post<ApiEnvelope<CreatePracticeSessionResult>>('/practice/sessions', input)
  return response.data.data!
}

export async function getPracticeSession(sessionId: string) {
  const response = await apiClient.get<ApiEnvelope<PracticeSession>>(`/practice/sessions/${sessionId}`)
  return response.data.data!
}

export async function submitPracticeAnswer(sessionId: string, input: SubmitPracticeAnswerInput) {
  const response = await apiClient.post<ApiEnvelope<SubmitPracticeAnswerResult>>(`/practice/sessions/${sessionId}/answers`, input)
  return response.data.data!
}

export async function submitPracticePronunciationAttempt(input: {
  sessionId: string
  itemId: string
  audio: Blob
  durationMs: number
}) {
  const formData = new FormData()
  formData.append('itemId', input.itemId)
  formData.append('audio', input.audio, 'practice.wav')
  formData.append('durationMs', String(input.durationMs))

  const response = await apiClient.post<ApiEnvelope<SubmitPracticePronunciationResult>>(
    `/practice/sessions/${input.sessionId}/pronunciation-attempts`,
    formData,
  )
  return response.data.data!
}

export async function setPracticeReviewLevel(input: {
  sessionId: string
  wordId: string
  level: PracticeReviewLevel
  timeZoneId: string
}) {
  const response = await apiClient.put<ApiEnvelope<SetPracticeReviewLevelResult>>(
    `/practice/sessions/${input.sessionId}/words/${input.wordId}/review-level`,
    { level: input.level, timeZoneId: input.timeZoneId },
  )
  return response.data.data!
}

export async function completePracticeSession(input: { sessionId: string; timeZoneId: string }) {
  await apiClient.post<ApiEnvelope<unknown>>(
    `/practice/sessions/${input.sessionId}/complete`,
    { timeZoneId: input.timeZoneId },
  )
}
