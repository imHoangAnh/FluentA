import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type FlashcardCard = {
  id: string
  wordId: string
  word: string
  wordClass: string
  meaningVn: string
  meaningEn: string
  example: string
  thesaurus?: string | null
  collocation?: string | null
  note?: string | null
  reviewLevel?: number | null
  nextReviewDate?: string | null
  lapseCount: number
}

export type FlashcardDeck = {
  id: string
  boardId: string
  boardName: string
  boardLanguage: string
  pageId?: string | null
  name: string
  type: 'PageDeck'
  cards: FlashcardCard[]
}

export type DeckSession = {
  deckId: string
  boardId: string
  deckName: string
  deckType: 'PageDeck'
  boardLanguage: string
  cards: FlashcardCard[]
}

export type ReviewMode = 'dictation' | 'meaningToWord' | 'pronunciation' | 'random'
export type ReviewOrderType = 'sequential' | 'shuffle'

export type ReviewSessionWord = {
  wordId: string
  word: string
  wordClass: string
  meaningVn: string
  meaningEn: string
  example: string
  thesaurus?: string | null
  collocation?: string | null
  note?: string | null
  mode: ReviewMode | Exclude<ReviewMode, 'random'>
}

export type ReviewSessionCreated = {
  sessionId: string
  boardId: string
  boardName: string
  orderType: ReviewOrderType
  mode: ReviewMode
  totalWords: number
  words: ReviewSessionWord[]
}

export type ReviewSessionSummary = {
  sessionId: string
  totalWordsReviewed: number
  correct: number
  wrong: number
  correctPercent: number
  wrongPercent: number
  averageTimeSpentSeconds: number
}

export type ReviewResult = {
  wordId: string
  reviewHistoryId: string
  result: 'correct' | 'wrong'
  levelBefore: number
  levelAfter: number
  lapseCount: number
  nextReviewDate: string
}

export type ReviewSettings = {
  dailyLimit: number
  recapAfterAnswer: boolean
}

export type DashboardForecastPoint = {
  date: string
  dueCount: number
}

export type FlashcardDashboard = {
  boardId?: string | null
  boardName?: string | null
  totalCards: number
  totalReviews: number
  streakDays: number
  retentionRate: number
  overdue: number
  dueToday: number
  newCards: number
  forecast: DashboardForecastPoint[]
}

export type PracticeMode = 'dictation' | 'meaningToWord' | 'pronunciation'
export type PracticeSettings = {
  modeSequence: PracticeMode[]
}

export type PracticeSessionSummary = {
  id: string
  userId: string
  deckId: string
  mode: PracticeMode
  totalCards: number
  correctCards: number
  wrongCards: number
  completedAt: string
}

export type AddPracticeWordsToReviewResult = {
  deckId: string
  addedWordCount: number
  nextReviewDate: string
}

export async function listDecks() {
  const response = await apiClient.get<ApiEnvelope<FlashcardDeck[]>>('/flashcards/decks')
  return response.data.data ?? []
}

export async function getDeckSession(deckId: string) {
  const response = await apiClient.get<ApiEnvelope<DeckSession>>(`/flashcards/decks/${deckId}/cards`)
  return response.data.data!
}

export async function createReviewSession(input: {
  boardId: string
  orderType: ReviewOrderType
  mode: ReviewMode
  timeZoneId: string
}) {
  const response = await apiClient.post<ApiEnvelope<ReviewSessionCreated>>('/review/sessions', input)
  return response.data.data!
}

export async function createPracticeSessionSummary(input: {
  deckId: string
  mode: PracticeMode
  totalCards: number
  correctCards: number
  wrongCards: number
  timeZoneId: string
}) {
  const response = await apiClient.post<ApiEnvelope<PracticeSessionSummary>>('/practice/sessions', input)
  return response.data.data!
}

export async function addPracticeWordsToReview(input: {
  deckId: string
  timeZoneId: string
}) {
  const response = await apiClient.post<ApiEnvelope<AddPracticeWordsToReviewResult>>('/practice/add-to-review', input)
  return response.data.data!
}

export async function getReviewSessionSummary(sessionId: string) {
  const response = await apiClient.get<ApiEnvelope<ReviewSessionSummary>>(`/review/sessions/${sessionId}/summary`)
  return response.data.data!
}

export async function getDashboard(timeZoneId: string, boardId?: string) {
  const path = boardId ? `/review/dashboard/${boardId}` : '/review/dashboard'
  const response = await apiClient.get<ApiEnvelope<FlashcardDashboard>>(path, { params: { timeZoneId } })
  return response.data.data!
}

export async function getPracticeSettings() {
  const response = await apiClient.get<ApiEnvelope<PracticeSettings>>('/practice/settings')
  return response.data.data!
}

export async function updatePracticeSettings(input: PracticeSettings) {
  const response = await apiClient.put<ApiEnvelope<PracticeSettings>>('/practice/settings', input)
  return response.data.data!
}

export async function getReviewSettings() {
  const response = await apiClient.get<ApiEnvelope<ReviewSettings>>('/review/settings')
  return response.data.data!
}

export async function updateReviewSettings(input: ReviewSettings) {
  const response = await apiClient.put<ApiEnvelope<ReviewSettings>>('/review/settings', input)
  return response.data.data!
}

export async function submitReview(input: {
  sessionId: string
  wordId: string
  correct: boolean
  timeSpentSeconds: number
  timeZoneId: string
}) {
  const response = await apiClient.post<ApiEnvelope<ReviewResult>>('/review', input)
  return response.data.data!
}
