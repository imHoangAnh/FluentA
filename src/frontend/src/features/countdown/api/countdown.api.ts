import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'
import type { TrashEntry } from '@/features/trash'

export type CountdownEvent = {
  id: string
  name: string
  targetDate: string
  coverAssetId?: string | null
  coverDownloadUrl?: string | null
  coverDownloadUrlExpiresAt?: string | null
  repeatPattern: CountdownRepeatPattern
  isCompleted: boolean
  alerts: CountdownAlert[]
  createdAt: string
  updatedAt: string
}

export type CountdownRepeatPattern = 'None' | 'Weekly' | 'Monthly' | 'Yearly'

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
  repeatPattern?: CountdownRepeatPattern
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
  const response = await apiClient.delete<ApiEnvelope<TrashEntry>>(`/countdowns/${id}`)
  return response.data.data!
}
