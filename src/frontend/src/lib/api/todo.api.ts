import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type TodoItem = {
  id: string
  title: string
  note?: string | null
  date: string
  isCompleted: boolean
  completedAt?: string | null
  sortOrder: number
  isCarriedOver: boolean
  originalDate?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  date: string
  note?: string | null
}

export type UpdateTodoInput = {
  title?: string
  date?: string
  note?: string
  isCompleted?: boolean
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

export async function createTodo(input: CreateTodoInput) {
  const response = await apiClient.post<ApiEnvelope<TodoItem>>('/todos', input)
  return response.data.data!
}

export async function updateTodo(id: string, input: UpdateTodoInput) {
  const response = await apiClient.patch<ApiEnvelope<TodoItem>>(`/todos/${id}`, input)
  return response.data.data!
}

export async function deleteTodo(id: string) {
  await apiClient.delete(`/todos/${id}`)
}
