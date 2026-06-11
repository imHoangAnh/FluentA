import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type CountdownEvent = {
  id: string
  name: string
  targetDate: string
  color?: string | null
  icon?: string | null
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCountdownInput = {
  name: string
  targetDate: string
  color?: string | null
  icon?: string | null
}

export type UpdateCountdownInput = {
  name?: string
  targetDate?: string
  color?: string | null
  icon?: string | null
}

export async function listCountdowns() {
  const response = await apiClient.get<ApiEnvelope<CountdownEvent[]>>('/countdowns')
  return response.data.data ?? []
}

export async function createCountdown(input: CreateCountdownInput) {
  const response = await apiClient.post<ApiEnvelope<CountdownEvent>>('/countdowns', input)
  return response.data.data!
}

export async function updateCountdown(id: string, input: UpdateCountdownInput) {
  const response = await apiClient.patch<ApiEnvelope<CountdownEvent>>(`/countdowns/${id}`, input)
  return response.data.data!
}

export async function deleteCountdown(id: string) {
  await apiClient.delete(`/countdowns/${id}`)
}
