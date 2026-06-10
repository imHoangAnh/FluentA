import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type BoardSummary = {
  id: string
  name: string
  language: string
  sortOrder: number
  pageCount: number
  createdAt: string
  updatedAt: string
}

export type Page = {
  id: string
  boardId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type BoardDetail = BoardSummary & {
  pages: Page[]
}

export type WordClass = 'noun' | 'verb' | 'adj' | 'adv' | 'phrase' | 'other'

export type WordInput = {
  word: string
  meaningVn: string
  meaningEn: string
  class: WordClass
  example: string
  thesaurus?: string | null
  collocation?: string | null
  note?: string | null
  customValues?: CustomValue[]
}

export type CustomValue = {
  columnId: string
  value?: string | null
}

export type Word = WordInput & {
  id: string
  pageId: string
  createdAt: string
  updatedAt: string
}

export type CustomColumn = {
  id: string
  name: string
  type: 'text' | 'number'
  sortOrder: number
}

export type ColumnConfiguration = {
  customColumns: CustomColumn[]
  hiddenColumnKeys: string[]
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

export async function updateBoard(boardId: string, input: { name: string; language: string; sortOrder?: number }) {
  const response = await apiClient.patch<ApiEnvelope<BoardDetail>>(`/boards/${boardId}`, input)
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  await apiClient.delete(`/boards/${boardId}`)
}

export async function createPage(boardId: string, input: { name: string; sortOrder?: number }) {
  const response = await apiClient.post<ApiEnvelope<Page>>(`/boards/${boardId}/pages`, input)
  return response.data.data!
}

export async function updatePage(boardId: string, pageId: string, input: { name: string; sortOrder?: number }) {
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

export async function getColumnConfiguration(boardId: string) {
  const response = await apiClient.get<ApiEnvelope<ColumnConfiguration>>(`/boards/${boardId}/columns`)
  return response.data.data!
}

export async function createCustomColumn(boardId: string, input: { name: string; type: 'text' | 'number' }) {
  const response = await apiClient.post<ApiEnvelope<CustomColumn>>(`/boards/${boardId}/columns`, input)
  return response.data.data!
}

export async function deleteCustomColumn(boardId: string, columnId: string) {
  await apiClient.delete(`/boards/${boardId}/columns/${columnId}`)
}

export async function updateColumnVisibility(boardId: string, hiddenColumnKeys: string[]) {
  const response = await apiClient.put<ApiEnvelope<ColumnConfiguration>>(`/boards/${boardId}/column-visibility`, { hiddenColumnKeys })
  return response.data.data!
}
