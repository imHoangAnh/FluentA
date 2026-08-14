import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { TrashEntry } from '@/shared/api/deletion.contracts'

export type TodoRepeatPattern = 'Daily' | 'Weekdays' | 'Weekly' | 'Monthly' | 'Yearly'

export type TodoReminderInput = {
  time: string
  timeZoneId: string
  scheduledAtUtc: string
}

export type TodoReminder = TodoReminderInput & {
  sentAtUtc?: string | null
}

export type TodoItem = {
  id: string
  title: string
  note?: string | null
  date: string
  sortOrder: number
  isCompleted: boolean
  isImportant: boolean
  repeatPattern?: TodoRepeatPattern | null
  reminder?: TodoReminder | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  warningCode?: 'recurrence-next-retained' | 'reminder-cleared-after-date-change' | null
}

export type CreateTodoInput = {
  title: string
  date: string
  note?: string | null
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
  reminder?: TodoReminderInput | null
}

export type UpdateTodoInput = {
  title?: string
  note?: string
  isCompleted?: boolean
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
  reminder?: TodoReminderInput | null
  date?: string
  sortOrder?: number
}

export async function listByDate(date: string) {
  const response = await apiClient.get<ApiEnvelope<TodoItem[]>>('/todos', { params: { date } })
  return response.data.data ?? []
}

export async function listByRange(startDate: string, endDate: string) {
  const response = await apiClient.get<ApiEnvelope<TodoItem[]>>('/todos', { params: { startDate, endDate } })
  return response.data.data ?? []
}

export async function getTodo(id: string) {
  const response = await apiClient.get<ApiEnvelope<TodoItem>>(`/todos/${id}`)
  return response.data.data!
}

export async function createTodo(input: CreateTodoInput) {
  const response = await apiClient.post<ApiEnvelope<TodoItem>>('/todos', input)
  return response.data.data!
}

export async function updateTodo(id: string, input: UpdateTodoInput) {
  const response = await apiClient.patch<ApiEnvelope<TodoItem>>(`/todos/${id}`, input)
  return response.data.data!
}

export async function duplicateTodo(id: string) {
  const response = await apiClient.post<ApiEnvelope<TodoItem>>(`/todos/${id}/duplicate`)
  return response.data.data!
}

export async function deleteTodo(id: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/todos/${id}`)
  return response.data.data!
}
