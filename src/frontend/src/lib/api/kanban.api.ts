import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type KanbanBoardSummary = {
  id: string
  name: string
  columnCount: number
  cardCount: number
  createdAt: string
  updatedAt: string
}

export type KanbanBoardDetail = {
  id: string
  name: string
  columns: KanbanColumn[]
  createdAt: string
  updatedAt: string
}

export type KanbanColumn = {
  id: string
  name: string
  sortOrder: number
  cards: KanbanCard[]
  createdAt: string
  updatedAt: string
}

export type KanbanCard = {
  id: string
  columnId: string
  title: string
  description?: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  deadline?: string | null
  sortOrder: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type CreateKanbanCardInput = {
  columnId: string
  title: string
  description?: string | null
  priority?: string | null
  deadline?: string | null
  tags?: string[]
}

export type UpdateKanbanCardInput = {
  title?: string
  description?: string
  priority?: string
  deadline?: string
  tags?: string[]
}

export async function listBoards() {
  const response = await apiClient.get<ApiEnvelope<KanbanBoardSummary[]>>('/kanban/boards')
  return response.data.data ?? []
}

export async function createBoard(name: string) {
  const response = await apiClient.post<ApiEnvelope<KanbanBoardDetail>>('/kanban/boards', { name })
  return response.data.data!
}

export async function getBoard(boardId: string) {
  const response = await apiClient.get<ApiEnvelope<KanbanBoardDetail>>(`/kanban/boards/${boardId}`)
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  await apiClient.delete(`/kanban/boards/${boardId}`)
}

export async function createColumn(boardId: string, name: string) {
  const response = await apiClient.post<ApiEnvelope<KanbanColumn>>(`/kanban/boards/${boardId}/columns`, { name })
  return response.data.data!
}

export async function updateColumn(boardId: string, columnId: string, input: { name?: string; sortOrder?: number }) {
  const response = await apiClient.patch<ApiEnvelope<KanbanColumn>>(`/kanban/boards/${boardId}/columns/${columnId}`, input)
  return response.data.data!
}

export async function deleteColumn(boardId: string, columnId: string) {
  await apiClient.delete(`/kanban/boards/${boardId}/columns/${columnId}`)
}

export async function createCard(boardId: string, input: CreateKanbanCardInput) {
  const response = await apiClient.post<ApiEnvelope<KanbanCard>>(`/kanban/boards/${boardId}/cards`, input)
  return response.data.data!
}

export async function updateCard(cardId: string, input: UpdateKanbanCardInput) {
  const response = await apiClient.patch<ApiEnvelope<KanbanCard>>(`/kanban/cards/${cardId}`, input)
  return response.data.data!
}

export async function moveCard(cardId: string, columnId: string, sortOrder: number) {
  const response = await apiClient.patch<ApiEnvelope<KanbanCard>>(`/kanban/cards/${cardId}/move`, { columnId, sortOrder })
  return response.data.data!
}

export async function deleteCard(cardId: string) {
  await apiClient.delete(`/kanban/cards/${cardId}`)
}
