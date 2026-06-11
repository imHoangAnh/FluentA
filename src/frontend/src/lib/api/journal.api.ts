import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type JournalEntry = {
  id: string
  title: string
  content: string
  preview: string
  learningDate?: string | null
  createdAt: string
  updatedAt: string
}

export type JournalEntrySummary = Omit<JournalEntry, 'content'>

export type CreateJournalEntryInput = {
  title: string
  content?: string | null
  learningDate?: string | null
}

export type UpdateJournalEntryInput = {
  title?: string
  content?: string
  learningDate?: string
}

export async function listJournalEntries() {
  const response = await apiClient.get<ApiEnvelope<JournalEntrySummary[]>>('/journals')
  return response.data.data ?? []
}

export async function getJournalEntry(id: string) {
  const response = await apiClient.get<ApiEnvelope<JournalEntry>>(`/journals/${id}`)
  return response.data.data!
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const response = await apiClient.post<ApiEnvelope<JournalEntry>>('/journals', input)
  return response.data.data!
}

export async function updateJournalEntry(id: string, input: UpdateJournalEntryInput) {
  const response = await apiClient.patch<ApiEnvelope<JournalEntry>>(`/journals/${id}`, input)
  return response.data.data!
}

export async function deleteJournalEntry(id: string) {
  await apiClient.delete(`/journals/${id}`)
}
