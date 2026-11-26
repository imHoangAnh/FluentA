import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'
import type { DeleteResult } from '@/shared/api/deletion.contracts'

export type NotePageSummary = {
  id: string
  boardId: string
  name: string
  date: string
  createdAt: string
  updatedAt: string
}

export type NoteBoardSummary = {
  id: string
  name: string
  pages: NotePageSummary[]
  createdAt: string
  updatedAt: string
}

export type NotePage = {
  id: string
  boardId: string
  name: string
  content: string
  date: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteBoardInput = {
  name: string
}

export type CreateNotePageInput = {
  name: string
}

export type UpdateNotePageInput = {
  name?: string
  content?: string
}

export async function listBoards() {
  const response = await apiClient.get<ApiResponse<NoteBoardSummary[]>>('/notes/boards')
  return response.data.data ?? []
}

export async function createBoard(input: CreateNoteBoardInput) {
  const response = await apiClient.post<ApiResponse<NoteBoardSummary>>('/notes/boards', input)
  return response.data.data!
}

export async function updateBoard(boardId: string, input: { name: string }) {
  const response = await apiClient.patch<ApiResponse<NoteBoardSummary>>(`/notes/boards/${boardId}`, input)
  return response.data.data!
}

export async function deleteBoard(boardId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/notes/boards/${boardId}`)
  return response.data.data!
}

export async function createPage(boardId: string, input: CreateNotePageInput) {
  const response = await apiClient.post<ApiResponse<NotePage>>(`/notes/boards/${boardId}/pages`, input)
  return response.data.data!
}

export async function getPage(pageId: string) {
  const response = await apiClient.get<ApiResponse<NotePage>>(`/notes/pages/${pageId}`)
  return response.data.data!
}

export async function updatePage(pageId: string, input: UpdateNotePageInput) {
  const response = await apiClient.patch<ApiResponse<NotePage>>(`/notes/pages/${pageId}`, input)
  return response.data.data!
}

export async function deletePage(pageId: string) {
  const response = await apiClient.delete<ApiResponse<DeleteResult>>(`/notes/pages/${pageId}`)
  return response.data.data!
}
