import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type TodoRepeatPattern = 'Daily' | 'Weekdays' | 'Weekly' | 'Monthly' | 'Yearly'

export type TodoItem = {
  id: string
  title: string
  note?: string | null
  date: string
  sortOrder: number
  isCompleted: boolean
  isImportant: boolean
  repeatPattern?: TodoRepeatPattern | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  warningCode?: 'recurrence-next-retained' | null
}

export type CreateTodoInput = {
  title: string
  date: string
  note?: string | null
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
}

export type UpdateTodoInput = {
  title?: string
  note?: string
  isCompleted?: boolean
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
  date?: string
  sortOrder?: number
}

export async function listByDate(date: string) {
  const response = await apiClient.get<ApiResponse<TodoItem[]>>('/todos', { params: { date } })
  return response.data.data ?? []
}

export async function listByRange(startDate: string, endDate: string) {
  const response = await apiClient.get<ApiResponse<TodoItem[]>>('/todos', { params: { startDate, endDate } })
  return response.data.data ?? []
}

export async function getTodo(id: string) {
  const response = await apiClient.get<ApiResponse<TodoItem>>(`/todos/${id}`)
  return response.data.data!
}

export async function createTodo(input: CreateTodoInput) {
  const response = await apiClient.post<ApiResponse<TodoItem>>('/todos', input)
  return response.data.data!
}

export async function updateTodo(id: string, input: UpdateTodoInput) {
  const response = await apiClient.patch<ApiResponse<TodoItem>>(`/todos/${id}`, input)
  return response.data.data!
}

export async function duplicateTodo(id: string) {
  const response = await apiClient.post<ApiResponse<TodoItem>>(`/todos/${id}/duplicate`)
  return response.data.data!
}

export async function deleteTodo(id: string) {
  await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/todos/${id}`)
}
