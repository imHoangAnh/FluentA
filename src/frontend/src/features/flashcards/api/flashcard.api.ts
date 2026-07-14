import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

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
  isInReview: boolean
  reviewLevel?: number | null
  nextReviewDate?: string | null
  lapseCount: number
}

export type FlashcardPage = {
  pageId: string
  pageName: string
  isPracticed: boolean
  words: FlashcardCard[]
}

export type FlashcardBoard = {
  boardId: string
  boardName: string
  boardLanguage: string
  pages: FlashcardPage[]
}

export type PageSession = {
  pageId: string
  boardId: string
  pageName: string
  boardLanguage: string
  words: FlashcardCard[]
}

export async function listBoards() {
  const response = await apiClient.get<ApiEnvelope<FlashcardBoard[]>>('/flashcards/pages')
  return response.data.data ?? []
}

export async function getPageSession(pageId: string) {
  const response = await apiClient.get<ApiEnvelope<PageSession>>(`/flashcards/pages/${pageId}/words`)
  return response.data.data!
}
