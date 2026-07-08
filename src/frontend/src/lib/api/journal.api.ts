import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type JournalEntry = {
  id: string
  title: string
  content: string
  date: string
  createdAt: string
  updatedAt: string
}

export type JournalEntrySummary = {
  id: string
  title: string
  date: string
  createdAt: string
  updatedAt: string
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
}

export type CreateJournalEntryInput = {
  title: string
  date: string
  content?: string | null
}

export type UpdateJournalEntryInput = {
  title?: string
  content?: string
  date?: string
}

export async function listJournalEntries() {
  const response = await apiClient.get<ApiEnvelope<JournalEntrySummary[]>>('/journal')
  return response.data.data ?? []
}

export async function searchJournalEntries(query: string) {
  const response = await apiClient.get<ApiEnvelope<JournalSearchResult[]>>('/journal/search', {
    params: { q: query },
  })
  return response.data.data ?? []
}

export async function getJournalCalendar(month: string) {
  const response = await apiClient.get<ApiEnvelope<JournalCalendarDay[]>>('/journal/calendar', {
    params: { month },
  })
  return response.data.data ?? []
}

export async function getJournalEntry(id: string) {
  const response = await apiClient.get<ApiEnvelope<JournalEntry>>(`/journal/${id}`)
  return response.data.data!
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const response = await apiClient.post<ApiEnvelope<JournalEntry>>('/journal', input)
  return response.data.data!
}

export async function updateJournalEntry(id: string, input: UpdateJournalEntryInput) {
  const response = await apiClient.patch<ApiEnvelope<JournalEntry>>(`/journal/${id}`, input)
  return response.data.data!
}

export async function deleteJournalEntry(id: string) {
  await apiClient.delete(`/journal/${id}`)
}
