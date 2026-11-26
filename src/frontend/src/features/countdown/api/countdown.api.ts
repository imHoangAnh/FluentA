import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type CountdownEvent = {
  id: string
  name: string
  targetDate: string
  coverAssetId?: string | null
  coverDownloadUrl?: string | null
  coverDownloadUrlExpiresAt?: string | null
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCountdownInput = {
  name: string
  targetDate: string
  coverAssetId?: string | null
}

export async function listCountdowns() {
  const response = await apiClient.get<ApiResponse<CountdownEvent[]>>('/countdowns')
  return response.data.data ?? []
}

export async function createCountdown(input: CreateCountdownInput) {
  const response = await apiClient.post<ApiResponse<CountdownEvent>>('/countdowns', input)
  return response.data.data!
}

export async function deleteCountdown(id: string) {
  await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/countdowns/${id}`)
}
