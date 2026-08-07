import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'
import type { TrashEntry } from '@/features/trash'

export type ProjectBoardSummary = {
  id: string
  name: string
  columnCount: number
  cardCount: number
  createdAt: string
  updatedAt: string
}

export type ProjectBoardDetail = {
  id: string
  name: string
  columns: ProjectColumn[]
  createdAt: string
  updatedAt: string
}

export type ProjectColumn = {
  id: string
  name: string
  sortOrder: number
  cards: ProjectCard[]
  createdAt: string
  updatedAt: string
}

export type ProjectCard = {
  id: string
  columnId: string
  title: string
  description?: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  deadline?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateProjectCardInput = {
  columnId: string
  title: string
  description?: string | null
  priority?: string | null
  deadline?: string | null
}

export type UpdateProjectCardInput = {
  title?: string
  description?: string
  priority?: string
  deadline?: string
}

export async function listBoards() {
  const response = await apiClient.get<ApiEnvelope<ProjectBoardSummary[]>>('/project/boards')
  return response.data.data ?? []
}

export async function createBoard(name: string) {
  const response = await apiClient.post<ApiEnvelope<ProjectBoardDetail>>('/project/boards', { name })
  return response.data.data!
}

export async function getBoard(boardId: string) {
  const response = await apiClient.get<ApiEnvelope<ProjectBoardDetail>>(`/project/boards/${boardId}`)
  return response.data.data!
}

export async function updateBoard(boardId: string, name: string) {
  const response = await apiClient.patch<ApiEnvelope<ProjectBoardDetail>>(`/project/boards/${boardId}`, { name })
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/project/boards/${boardId}`)
  return response.data.data!
}

export async function createColumn(boardId: string, name: string) {
  const response = await apiClient.post<ApiEnvelope<ProjectColumn>>(`/project/boards/${boardId}/columns`, { name })
  return response.data.data!
}

export async function updateColumn(boardId: string, columnId: string, input: { name?: string; sortOrder?: number }) {
  const response = await apiClient.patch<ApiEnvelope<ProjectColumn>>(`/project/boards/${boardId}/columns/${columnId}`, input)
  return response.data.data!
}

export async function deleteColumn(boardId: string, columnId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/project/boards/${boardId}/columns/${columnId}`)
  return response.data.data!
}

export async function createCard(boardId: string, input: CreateProjectCardInput) {
  const response = await apiClient.post<ApiEnvelope<ProjectCard>>(`/project/boards/${boardId}/cards`, input)
  return response.data.data!
}

export async function updateCard(cardId: string, input: UpdateProjectCardInput) {
  const response = await apiClient.patch<ApiEnvelope<ProjectCard>>(`/project/cards/${cardId}`, input)
  return response.data.data!
}

export async function moveCard(cardId: string, columnId: string, sortOrder: number) {
  const response = await apiClient.patch<ApiEnvelope<ProjectCard>>(`/project/cards/${cardId}/move`, { columnId, sortOrder })
  return response.data.data!
}

export async function deleteCard(cardId: string) {
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/project/cards/${cardId}`)
  return response.data.data!
}
