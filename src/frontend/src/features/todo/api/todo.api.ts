import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type TodoRepeatPattern = 'Daily' | 'Weekdays' | 'Weekly' | 'Monthly' | 'Yearly'

export type TodoPriorityTone = 'neutral' | 'primary' | 'warning' | 'destructive'

export type TodoPriority = {
  id: string
  name: string
  tone: TodoPriorityTone
  sortOrder: number
}

export type TodoTag = {
  id: string
  name: string
}

export type TodoSubtask = {
  id: string
  title: string
  isCompleted: boolean
  sortOrder: number
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
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  warningCode?: 'recurrence-next-retained' | null
  priorityId?: string | null
  priority?: TodoPriority | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  estimatedMinutes?: number | null
  tags?: TodoTag[]
  subtasks?: TodoSubtask[]
}

export type CreateTodoInput = {
  title: string
  date: string
  note?: string | null
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
  priorityId?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  estimatedMinutes?: number | null
  tagIds?: string[]
}

export type UpdateTodoInput = {
  title?: string
  note?: string
  isCompleted?: boolean
  isImportant?: boolean
  repeatPattern?: TodoRepeatPattern | null
  date?: string
  sortOrder?: number
  priorityId?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  estimatedMinutes?: number | null
  tagIds?: string[]
}

export type CreatePriorityInput = {
  name: string
  tone?: TodoPriorityTone
}

export type UpdatePriorityInput = {
  name?: string
  tone?: TodoPriorityTone
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

export async function listPriorities() {
  const response = await apiClient.get<ApiResponse<TodoPriority[]>>('/todos/priorities')
  return response.data.data ?? []
}

export async function createPriority(input: CreatePriorityInput) {
  const response = await apiClient.post<ApiResponse<TodoPriority>>('/todos/priorities', input)
  return response.data.data!
}

export async function updatePriority(id: string, input: UpdatePriorityInput) {
  const response = await apiClient.patch<ApiResponse<TodoPriority>>(`/todos/priorities/${id}`, input)
  return response.data.data!
}

export async function deletePriority(id: string) {
  await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/todos/priorities/${id}`)
}

export async function listTags() {
  const response = await apiClient.get<ApiResponse<TodoTag[]>>('/todos/tags')
  return response.data.data ?? []
}

export async function createTag(name: string) {
  const response = await apiClient.post<ApiResponse<TodoTag>>('/todos/tags', { name })
  return response.data.data!
}

export async function deleteTag(id: string) {
  await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/todos/tags/${id}`)
}

export async function createSubtask(todoId: string, title: string) {
  const response = await apiClient.post<ApiResponse<TodoSubtask>>(`/todos/${todoId}/subtasks`, { title })
  return response.data.data!
}

export async function updateSubtask(
  todoId: string,
  subtaskId: string,
  patch: { title?: string; isCompleted?: boolean; sortOrder?: number },
) {
  const response = await apiClient.patch<ApiResponse<TodoSubtask>>(`/todos/${todoId}/subtasks/${subtaskId}`, patch)
  return response.data.data!
}

export async function deleteSubtask(todoId: string, subtaskId: string) {
  await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/todos/${todoId}/subtasks/${subtaskId}`)
}
