import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { TrashEntry } from '@/shared/api/deletion.contracts'

export const DEFAULT_VOCAB_COLUMN_ORDER = [
  'word',
  'meaning',
  'ipaPronunciation',
  'context',
  'type',
  'example',
  'synonyms',
  'antonyms',
] as const

export const DEFAULT_VOCAB_COLUMN_WIDTHS: Record<string, number> = {
  word: 220,
  meaning: 240,
  ipaPronunciation: 180,
  context: 260,
  type: 140,
  example: 320,
  synonyms: 220,
  antonyms: 220,
}

export const OPTIONAL_VOCAB_COLUMNS = [
  { key: 'context', label: 'Context' },
  { key: 'synonyms', label: 'Synonyms' },
  { key: 'antonyms', label: 'Antonyms' },
] as const

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

export type CreateBoardInput = {
  name: string
  language: string
  includedOptionalColumns: string[]
}

export type UpdateBoardInput = {
  name: string
  language: string
  includedOptionalColumns?: string[]
}

export type WordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'conjunction'
  | 'preposition'
  | 'phrase'
  | 'collocation'
  | 'idiom'
  | 'phrasalverb'
  | 'nounphrase'
  | 'verbphrase'
  | 'expression'
  | 'slang'
  | 'other'

export const WORD_TYPE_OPTIONS: ReadonlyArray<{ value: WordType; label: string }> = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'collocation', label: 'Collocation' },
  { value: 'idiom', label: 'Idiom' },
  { value: 'phrasalverb', label: 'Phrasal Verb' },
  { value: 'nounphrase', label: 'Noun Phrase' },
  { value: 'verbphrase', label: 'Verb Phrase' },
  { value: 'expression', label: 'Expression' },
  { value: 'slang', label: 'Slang' },
  { value: 'other', label: 'Other' },
]

export type WordInput = {
  word: string
  meaning: string
  ipaPronunciation: string
  type: WordType
  context?: string | null
  example: string
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
  const response = await apiClient.get<ApiEnvelope<BoardSummary[]>>('/vocabs/boards')
  return response.data.data ?? []
}

export async function createBoard(input: CreateBoardInput) {
  const response = await apiClient.post<ApiEnvelope<BoardDetail>>('/vocabs/boards', input)
  return response.data.data!
}

export async function getBoard(boardId: string) {
  const response = await apiClient.get<ApiEnvelope<BoardDetail>>(`/vocabs/boards/${boardId}`)
  return response.data.data!
}

export async function updateBoard(boardId: string, input: UpdateBoardInput) {
  const response = await apiClient.patch<ApiEnvelope<BoardDetail>>(`/vocabs/boards/${boardId}`, input)
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/vocabs/boards/${boardId}`)
  return response.data.data!
}

export async function createPage(boardId: string, input: { name: string }) {
  const response = await apiClient.post<ApiEnvelope<Page>>(`/vocabs/boards/${boardId}/pages`, input)
  return response.data.data!
}

export async function updatePage(pageId: string, input: { name: string }) {
  const response = await apiClient.patch<ApiEnvelope<Page>>(`/vocabs/pages/${pageId}`, input)
  return response.data.data!
}

export async function deletePage(pageId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/vocabs/pages/${pageId}`)
  return response.data.data!
}

export async function listWords(pageId: string) {
  const response = await apiClient.get<ApiEnvelope<Word[]>>(`/vocabs/pages/${pageId}/words`)
  return response.data.data ?? []
}

export async function createWord(pageId: string, input: WordInput) {
  const response = await apiClient.post<ApiEnvelope<Word>>(`/vocabs/pages/${pageId}/words`, input)
  return response.data.data!
}

export async function updateWord(wordId: string, input: WordInput) {
  const response = await apiClient.patch<ApiEnvelope<Word>>(`/vocabs/words/${wordId}`, input)
  return response.data.data!
}

export async function updateWordCell(wordId: string, columnKey: keyof WordInput, value: string) {
  const response = await apiClient.patch<ApiEnvelope<Word>>(`/vocabs/words/${wordId}`, { [columnKey]: value })
  return response.data.data!
}

export async function deleteWord(wordId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/vocabs/words/${wordId}`)
  return response.data.data!
}

export async function updateBoardPreferences(boardId: string, input: {
  hiddenColumns: string[]
  columnOrder: string[]
  columnWidths: Record<string, number>
}) {
  const response = await apiClient.put<ApiEnvelope<BoardPreferences>>(`/vocabs/boards/${boardId}/preferences`, input)
  return response.data.data!
}
