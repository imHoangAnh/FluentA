import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'
import type { DeleteResult } from '@/shared/api/deletion.contracts'

export type JournalMoodId =
  | 'peaceful'
  | 'grateful'
  | 'energized'
  | 'reflective'
  | 'tired'
  | 'stressed'

export type JournalEntry = {
  id: string
  title: string
  content: string
  date: string
  createdAt: string
  updatedAt: string
  mood?: JournalMoodId | null
  isStarred?: boolean
  tags?: string[]
}

export type JournalEntrySummary = {
  id: string
  title: string
  date: string
  createdAt: string
  updatedAt: string
  mood?: JournalMoodId | null
  isStarred?: boolean
  tags?: string[]
  preview?: string
}

export type JournalHighlightRange = {
  start: number
  length: number
}

export type JournalSearchResult = JournalEntrySummary & {
  highlights: JournalHighlightRange[]
}

export type JournalCalendarDay = {
  date: string
  count: number
  mood?: JournalMoodId | null
}

export type JournalVocabSuggestion = {
  id: string
  word: string
  meaning: string
  type: string
}

export type CreateJournalEntryInput = {
  title: string
  date: string
  content?: string | null
  mood?: JournalMoodId | null
  isStarred?: boolean
  tags?: string[]
}

export type UpdateJournalEntryInput = {
  title?: string
  content?: string
  date?: string
  mood?: JournalMoodId | '' | null
  isStarred?: boolean
  tags?: string[]
}

export async function listJournalEntries() {
  const response = await apiClient.get<ApiResponse<JournalEntrySummary[]>>('/journal')
  return response.data.data ?? []
}

export async function searchJournalEntries(query: string) {
  const response = await apiClient.get<ApiResponse<JournalSearchResult[]>>('/journal/search', {
    params: { q: query },
  })
  return response.data.data ?? []
}

export async function getJournalCalendar(month: string) {
  const response = await apiClient.get<ApiResponse<JournalCalendarDay[]>>('/journal/calendar', {
    params: { month },
  })
  return response.data.data ?? []
}

export async function getJournalVocabSuggestions(count = 5) {
  const response = await apiClient.get<ApiResponse<JournalVocabSuggestion[]>>('/journal/vocab-suggestions', {
    params: { count },
  })
  return response.data.data ?? []
}

export async function getJournalEntry(id: string) {
  const response = await apiClient.get<ApiResponse<JournalEntry>>(`/journal/${id}`)
  return response.data.data!
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const response = await apiClient.post<ApiResponse<JournalEntry>>('/journal', input)
  return response.data.data!
}

export async function updateJournalEntry(id: string, input: UpdateJournalEntryInput) {
  const response = await apiClient.patch<ApiResponse<JournalEntry>>(`/journal/${id}`, input)
  return response.data.data!
}

export async function deleteJournalEntry(id: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/journal/${id}`)
  return response.data.data!
}
