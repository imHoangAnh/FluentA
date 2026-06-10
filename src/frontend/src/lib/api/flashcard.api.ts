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
  type: 'PageDeck' | 'AllWords'
  cards: FlashcardCard[]
}

export type DeckSession = {
  deckId: string
  boardId: string
  deckName: string
  deckType: 'PageDeck' | 'AllWords'
  boardLanguage: string
  cards: FlashcardCard[]
}

export type ReviewRating = 0 | 1 | 2 | 3

export type ReviewSessionCreated = {
  sessionId: string
  deckId: string
  deckName: string
  deckType: 'PageDeck' | 'AllWords'
  totalCards: number
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
  newCardsPerDay: number
  reviewCardsPerDay: number
}

export type DueDeck = {
  deckId: string
  boardId: string
  deckName: string
  boardLanguage: string
  settings: ReviewSettings
  newCards: { limit: number; consumed: number; remaining: number }
  reviews: { limit: number; consumed: number; remaining: number }
  counts: { overdue: number; dueToday: number; newCards: number; total: number }
  cards: FlashcardCard[]
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

export async function listDecks() {
  const response = await apiClient.get<ApiEnvelope<FlashcardDeck[]>>('/flashcards/decks')
  return response.data.data ?? []
}

export async function getDeckSession(deckId: string) {
  const response = await apiClient.get<ApiEnvelope<DeckSession>>(`/flashcards/decks/${deckId}/cards`)
  return response.data.data!
}

export async function getDueDeck(deckId: string, timeZoneId: string) {
  const response = await apiClient.get<ApiEnvelope<DueDeck>>(`/flashcards/decks/${deckId}/due`, { params: { timeZoneId } })
  return response.data.data!
}

export async function createReviewSession(deckId: string) {
  const response = await apiClient.post<ApiEnvelope<ReviewSessionCreated>>('/flashcards/sessions', { deckId })
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
  rating: ReviewRating
  timeSpentSeconds: number
  timeZoneId: string
}) {
  const response = await apiClient.post('/flashcards/review', input)
  return response.data
}
