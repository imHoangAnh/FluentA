import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type CountdownEvent = {
  id: string
  name: string
  targetDate: string
  coverAssetId?: string | null
  coverUrl?: string | null
  isCompleted: boolean
  alerts: CountdownAlert[]
  createdAt: string
  updatedAt: string
}

export type CountdownAlert = {
  id: string
  alertDay: string
  alertTime: string
  scheduledAtUtc: string
  firedAtUtc?: string | null
}

export type CreateCountdownInput = {
  name: string
  targetDate: string
  alerts: Array<{
    alertDay: string
    alertTime: string
  }>
  coverAssetId?: string | null
}

export async function listCountdowns() {
  const response = await apiClient.get<ApiEnvelope<CountdownEvent[]>>('/countdowns')
  return response.data.data ?? []
}

export async function createCountdown(input: CreateCountdownInput) {
  const response = await apiClient.post<ApiEnvelope<CountdownEvent>>('/countdowns', input)
  return response.data.data!
}

export async function deleteCountdown(id: string) {
  await apiClient.delete(`/countdowns/${id}`)
}
