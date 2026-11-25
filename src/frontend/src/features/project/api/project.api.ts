import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'
import type { DeleteResult } from '@/shared/api/deletion.contracts'

export type ProjectLabelTone = 'primary' | 'neutral' | 'success' | 'warning' | 'info'

export type ProjectMilestone = {
  id: string
  boardId: string
  name: string
  sortOrder: number
}

export type ProjectLabel = {
  id: string
  boardId: string
  name: string
  tone: ProjectLabelTone
}

export type ProjectCardChecklistItem = {
  id: string
  title: string
  isCompleted: boolean
  sortOrder: number
}

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
  milestones?: ProjectMilestone[]
  labels?: ProjectLabel[]
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
  milestoneId?: string | null
  milestone?: ProjectMilestone | null
  labelId?: string | null
  label?: ProjectLabel | null
  checklistItems?: ProjectCardChecklistItem[]
}

export type CreateProjectCardInput = {
  columnId: string
  title: string
  description?: string | null
  priority?: string | null
  deadline?: string | null
  milestoneId?: string | null
  labelId?: string | null
  checklistTitles?: string[]
}

export type UpdateProjectCardInput = {
  title?: string
  description?: string
  priority?: string
  deadline?: string
  milestoneId?: string | null
  labelId?: string | null
}

export async function listBoards() {
  const response = await apiClient.get<ApiResponse<ProjectBoardSummary[]>>('/project/boards')
  return response.data.data ?? []
}

export async function createBoard(name: string) {
  const response = await apiClient.post<ApiResponse<ProjectBoardDetail>>('/project/boards', { name })
  return response.data.data!
}

export async function getBoard(boardId: string) {
  const response = await apiClient.get<ApiResponse<ProjectBoardDetail>>(`/project/boards/${boardId}`)
  return response.data.data!
}

export async function updateBoard(boardId: string, name: string) {
  const response = await apiClient.patch<ApiResponse<ProjectBoardDetail>>(`/project/boards/${boardId}`, { name })
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/boards/${boardId}`)
  return response.data.data!
}

export async function createColumn(boardId: string, name: string) {
  const response = await apiClient.post<ApiResponse<ProjectColumn>>(`/project/boards/${boardId}/columns`, { name })
  return response.data.data!
}

export async function updateColumn(boardId: string, columnId: string, input: { name?: string; sortOrder?: number }) {
  const response = await apiClient.patch<ApiResponse<ProjectColumn>>(`/project/boards/${boardId}/columns/${columnId}`, input)
  return response.data.data!
}

export async function deleteColumn(boardId: string, columnId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/boards/${boardId}/columns/${columnId}`)
  return response.data.data!
}

export async function createCard(boardId: string, input: CreateProjectCardInput) {
  const response = await apiClient.post<ApiResponse<ProjectCard>>(`/project/boards/${boardId}/cards`, input)
  return response.data.data!
}

export async function updateCard(cardId: string, input: UpdateProjectCardInput) {
  const response = await apiClient.patch<ApiResponse<ProjectCard>>(`/project/cards/${cardId}`, input)
  return response.data.data!
}

export async function moveCard(cardId: string, columnId: string, sortOrder: number) {
  const response = await apiClient.patch<ApiResponse<ProjectCard>>(`/project/cards/${cardId}/move`, { columnId, sortOrder })
  return response.data.data!
}

export async function deleteCard(cardId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/cards/${cardId}`)
  return response.data.data!
}

export async function createMilestone(boardId: string, name: string) {
  const response = await apiClient.post<ApiResponse<ProjectMilestone>>(`/project/boards/${boardId}/milestones`, { name })
  return response.data.data!
}

export async function updateMilestone(boardId: string, milestoneId: string, input: { name?: string; sortOrder?: number }) {
  const response = await apiClient.patch<ApiResponse<ProjectMilestone>>(`/project/boards/${boardId}/milestones/${milestoneId}`, input)
  return response.data.data!
}

export async function deleteMilestone(boardId: string, milestoneId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/boards/${boardId}/milestones/${milestoneId}`)
  return response.data.data!
}

export async function createLabel(boardId: string, input: { name: string; tone?: ProjectLabelTone }) {
  const response = await apiClient.post<ApiResponse<ProjectLabel>>(`/project/boards/${boardId}/labels`, input)
  return response.data.data!
}

export async function updateLabel(boardId: string, labelId: string, input: { name?: string; tone?: ProjectLabelTone }) {
  const response = await apiClient.patch<ApiResponse<ProjectLabel>>(`/project/boards/${boardId}/labels/${labelId}`, input)
  return response.data.data!
}

export async function deleteLabel(boardId: string, labelId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/boards/${boardId}/labels/${labelId}`)
  return response.data.data!
}

export async function createChecklistItem(cardId: string, title: string) {
  const response = await apiClient.post<ApiResponse<ProjectCardChecklistItem>>(`/project/cards/${cardId}/checklist`, { title })
  return response.data.data!
}

export async function updateChecklistItem(
  cardId: string,
  itemId: string,
  input: { title?: string; isCompleted?: boolean; sortOrder?: number },
) {
  const response = await apiClient.patch<ApiResponse<ProjectCardChecklistItem>>(`/project/cards/${cardId}/checklist/${itemId}`, input)
  return response.data.data!
}

export async function deleteChecklistItem(cardId: string, itemId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/project/cards/${cardId}/checklist/${itemId}`)
  return response.data.data!
}
