import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type PronunciationAssessment = { correct: boolean }

export async function assessPronunciation(wordId: string, audio: Blob) {
  const response = await apiClient.post<ApiEnvelope<PronunciationAssessment>>(
    `/pronunciation/words/${wordId}/assessment`,
    audio,
    { headers: { 'Content-Type': 'audio/wav' } },
  )
  return response.data.data!
}
