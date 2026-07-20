import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export const DEFAULT_VOCAB_COLUMN_ORDER = [
  'word',
  'meaningVn',
  'ipaPronunciation',
  'definition',
  'class',
  'example',
  'note',
  'synonyms',
  'antonyms',
] as const

export const DEFAULT_VOCAB_COLUMN_WIDTHS: Record<string, number> = {
  word: 220,
  meaningVn: 240,
  ipaPronunciation: 180,
  definition: 260,
  class: 140,
  example: 320,
  note: 260,
  synonyms: 220,
  antonyms: 220,
}

export type BoardSummary = {
  id: string
  name: string
  language: string
  pageCount: number
  createdAt: string
  updatedAt: string
}

export type Page = {
  id: string
  boardId: string
  name: string
  createdAt: string
  updatedAt: string
}

export type BoardPreferences = {
  id?: string | null
  hiddenColumns: string[]
  columnOrder: string[]
  columnWidths: Record<string, number>
  createdAt?: string | null
  updatedAt?: string | null
}

export type BoardDetail = BoardSummary & {
  pages: Page[]
  preferences: BoardPreferences
}

export type WordClass =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'adv'
  | 'phrase'
  | 'collocation'
  | 'phrasalverb'
  | 'idiom'
  | 'proverb'
  | 'nounphrase'
  | 'verbphrase'
  | 'other'

export const WORD_CLASS_OPTIONS: ReadonlyArray<{ value: WordClass; label: string }> = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adj', label: 'Adjective' },
  { value: 'adv', label: 'Adverb' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'collocation', label: 'Collocation' },
  { value: 'phrasalverb', label: 'Phrasal Verb' },
  { value: 'idiom', label: 'Idiom' },
  { value: 'proverb', label: 'Proverb' },
  { value: 'nounphrase', label: 'Noun Phrase' },
  { value: 'verbphrase', label: 'Verb Phrase' },
  { value: 'other', label: 'Other' },
]

export type WordInput = {
  word: string
  meaningVn: string
  ipaPronunciation: string
  definition?: string | null
  class: WordClass
  example: string
  note?: string | null
  synonyms?: string | null
  antonyms?: string | null
}

export type Word = WordInput & {
  id: string
  pageId: string
  createdAt: string
  updatedAt: string
}

export async function listBoards() {
  const response = await apiClient.get<ApiEnvelope<BoardSummary[]>>('/boards')
  return response.data.data ?? []
}

export async function createBoard(input: { name: string; language: string }) {
  const response = await apiClient.post<ApiEnvelope<BoardDetail>>('/boards', input)
  return response.data.data!
}

export async function getBoard(boardId: string) {
  const response = await apiClient.get<ApiEnvelope<BoardDetail>>(`/boards/${boardId}`)
  return response.data.data!
}

export async function updateBoard(boardId: string, input: { name: string; language: string }) {
  const response = await apiClient.patch<ApiEnvelope<BoardDetail>>(`/boards/${boardId}`, input)
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  await apiClient.delete(`/boards/${boardId}`)
}

export async function createPage(boardId: string, input: { name: string }) {
  const response = await apiClient.post<ApiEnvelope<Page>>(`/boards/${boardId}/pages`, input)
  return response.data.data!
}

export async function updatePage(boardId: string, pageId: string, input: { name: string }) {
  const response = await apiClient.patch<ApiEnvelope<Page>>(`/boards/${boardId}/pages/${pageId}`, input)
  return response.data.data!
}

export async function deletePage(boardId: string, pageId: string) {
  await apiClient.delete(`/boards/${boardId}/pages/${pageId}`)
}

export async function listWords(boardId: string, pageId: string) {
  const response = await apiClient.get<ApiEnvelope<Word[]>>(`/boards/${boardId}/pages/${pageId}/words`)
  return response.data.data ?? []
}

export async function createWord(boardId: string, pageId: string, input: WordInput) {
  const response = await apiClient.post<ApiEnvelope<Word>>(`/boards/${boardId}/pages/${pageId}/words`, input)
  return response.data.data!
}

export async function updateWord(boardId: string, wordId: string, input: WordInput) {
  const response = await apiClient.patch<ApiEnvelope<Word>>(`/boards/${boardId}/words/${wordId}`, input)
  return response.data.data!
}

export async function updateWordCell(boardId: string, wordId: string, columnKey: string, value: string) {
  const response = await apiClient.patch<ApiEnvelope<Word>>(`/boards/${boardId}/words/${wordId}/cells`, { columnKey, value })
  return response.data.data!
}

export async function deleteWord(boardId: string, wordId: string) {
  await apiClient.delete(`/boards/${boardId}/words/${wordId}`)
}

export async function updateBoardPreferences(boardId: string, input: {
  hiddenColumns: string[]
  columnOrder: string[]
  columnWidths: Record<string, number>
}) {
  const response = await apiClient.put<ApiEnvelope<BoardPreferences>>(`/boards/${boardId}/preferences`, input)
  return response.data.data!
}
