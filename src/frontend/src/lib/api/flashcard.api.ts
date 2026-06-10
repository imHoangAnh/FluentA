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

export async function listDecks() {
  const response = await apiClient.get<ApiEnvelope<FlashcardDeck[]>>('/flashcards/decks')
  return response.data.data ?? []
}

export async function getDeckSession(deckId: string) {
  const response = await apiClient.get<ApiEnvelope<DeckSession>>(`/flashcards/decks/${deckId}/cards`)
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
