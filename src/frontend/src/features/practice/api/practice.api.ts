import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type PracticeMode = 'dictation' | 'meaningToWord' | 'pronunciation'

export type PracticeSettings = {
  modeSequence: PracticeMode[]
}

export async function getPracticeSettings() {
  const response = await apiClient.get<ApiEnvelope<PracticeSettings>>('/practice/settings')
  return response.data.data!
}

export async function updatePracticeSettings(input: PracticeSettings) {
  const response = await apiClient.put<ApiEnvelope<PracticeSettings>>('/practice/settings', input)
  return response.data.data!
}
