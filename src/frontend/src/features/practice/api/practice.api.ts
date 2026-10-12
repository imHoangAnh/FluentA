import { apiClient } from '@/shared/api/client'
import type { ApiResponse, PagedResult } from '@/shared/api/contracts'
import type { PronunciationAssessment } from '@/features/pronunciation'

export type PracticeExerciseMode = 'dictation' | 'wordToMeaning' | 'pronunciation'
export type PracticeStep = PracticeExerciseMode | 'recap'
export type PracticeAnswerStep = PracticeStep
export type PracticeSessionStatus = 'active' | 'completed' | 'abandoned'
export type PracticeReviewLevel = 0 | 1 | 2 | 3 | 4 | 5
export type PracticeReviewStatus = 'added' | 'alreadyInReview'

export type PracticeDeck = {
  pageId: string
  pageName: string
  boardId: string
  boardName: string
  wordCount: number
}

export type PracticeDeckPage = PagedResult<PracticeDeck>

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
  attemptCount?: number
  pronunciationAttemptCount?: number
  lastAttempt?: { requestId: string; step: PracticeStep; correctness: boolean; isSkip: boolean; attemptNumber: number | null; assessment: PronunciationAssessment | null } | null
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
  requestId?: string
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
  const response = await apiClient.get<ApiResponse<PracticeDeckPage>>('/practice/decks', { params: input })
  return response.data.data!
}

export async function createPracticeSession(input: { pageId: string }) {
  const response = await apiClient.post<ApiResponse<CreatePracticeSessionResult>>('/practice/sessions', input)
  return response.data.data!
}

export async function getPracticeSession(sessionId: string, signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<PracticeSession>>(`/practice/sessions/${sessionId}`, { signal })
  return response.data.data!
}

export async function submitPracticeAnswer(sessionId: string, input: SubmitPracticeAnswerInput) {
  const response = await apiClient.post<ApiResponse<SubmitPracticeAnswerResult>>(`/practice/sessions/${sessionId}/answers`, input)
  return response.data.data!
}

export async function retryPracticeStep(input: {
  sessionId: string
  itemId: string
  step: PracticeExerciseMode
  attemptId: string
}) {
  const response = await apiClient.post<ApiResponse<{ itemId: string; step: PracticeExerciseMode }>>(
    `/practice/sessions/${input.sessionId}/retry`,
    { itemId: input.itemId, step: input.step, attemptId: input.attemptId },
  )
  return response.data.data!
}

export async function submitPracticePronunciationAttempt(input: {
  sessionId: string
  itemId: string
  audio: Blob
  durationMs: number
  requestId?: string
}) {
  const formData = new FormData()
  formData.append('itemId', input.itemId)
  formData.append('audio', input.audio, 'practice.wav')
  formData.append('durationMs', String(input.durationMs))
  if (input.requestId) formData.append('requestId', input.requestId)

  const response = await apiClient.post<ApiResponse<SubmitPracticePronunciationResult>>(
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
  const response = await apiClient.put<ApiResponse<SetPracticeReviewLevelResult>>(
    `/practice/sessions/${input.sessionId}/words/${input.wordId}/review-level`,
    { level: input.level, timeZoneId: input.timeZoneId },
  )
  return response.data.data!
}

export async function completePracticeSession(input: { sessionId: string; timeZoneId: string }) {
  await apiClient.post<ApiResponse<unknown>>(
    `/practice/sessions/${input.sessionId}/complete`,
    { timeZoneId: input.timeZoneId },
  )
}
