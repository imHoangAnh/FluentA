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
  interval: number
  easeFactor: number
  repetitions: number
  nextReviewDate?: string | null
  state: string
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
  cardId: string
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
  totalCardsReviewed: number
  easy: number
  good: number
  hard: number
  again: number
  easyPercent: number
  goodPercent: number
  hardPercent: number
  againPercent: number
  averageTimeSpentSeconds: number
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
  const response = await apiClient.post<ApiEnvelope<ReviewSessionCreated>>('/flashcards/sessions', input)
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
  const response = await apiClient.post<ApiEnvelope<PracticeSessionSummary>>('/flashcards/practice-sessions', input)
  return response.data.data!
}

export async function getReviewSessionSummary(sessionId: string) {
  const response = await apiClient.get<ApiEnvelope<ReviewSessionSummary>>(`/flashcards/sessions/${sessionId}/summary`)
  return response.data.data!
}

export async function getDashboard(timeZoneId: string, boardId?: string) {
  const path = boardId ? `/flashcards/dashboard/${boardId}` : '/flashcards/dashboard'
  const response = await apiClient.get<ApiEnvelope<FlashcardDashboard>>(path, { params: { timeZoneId } })
  return response.data.data!
}

export async function getPracticeSettings() {
  const response = await apiClient.get<ApiEnvelope<PracticeSettings>>('/flashcards/practice-settings')
  return response.data.data!
}

export async function updatePracticeSettings(input: PracticeSettings) {
  const response = await apiClient.put<ApiEnvelope<PracticeSettings>>('/flashcards/practice-settings', input)
  return response.data.data!
}

export async function getReviewSettings() {
  const response = await apiClient.get<ApiEnvelope<ReviewSettings>>('/flashcards/settings')
  return response.data.data!
}

export async function updateReviewSettings(input: ReviewSettings) {
  const response = await apiClient.put<ApiEnvelope<ReviewSettings>>('/flashcards/settings', input)
  return response.data.data!
}

export async function submitReview(input: {
  sessionId: string
  cardId: string
  correct: boolean
  timeSpentSeconds: number
  timeZoneId: string
}) {
  const response = await apiClient.post('/flashcards/review', input)
  return response.data
}
