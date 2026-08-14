import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type PronunciationUnitFeedback = { text: string; correct: boolean }
export type PronunciationWordFeedback = {
  text: string
  accuracyScore: number
  errorType?: string | null
  units: PronunciationUnitFeedback[]
}
export type PronunciationAssessment = {
  correct: boolean
  accuracyScore: number
  completenessScore?: number | null
  feedbackMode: 'phoneme' | 'word'
  words: PronunciationWordFeedback[]
}

export async function assessPronunciation(wordId: string, audio: Blob) {
  const response = await apiClient.post<ApiEnvelope<PronunciationAssessment>>(
    `/pronunciation/words/${wordId}/assessment`,
    audio,
    { headers: { 'Content-Type': 'audio/wav' } },
  )
  return response.data.data!
}

export function getPronunciationAssessmentErrorMessage(error: unknown) {
  const code = (error as { response?: { data?: ApiEnvelope<never> } }).response?.data?.error?.code
  if (code === 'PRONUNCIATION_NOT_RECOGNIZED') {
    return 'No speech was recognized. Try recording again; this did not use an attempt.'
  }

  return 'Pronunciation assessment is unavailable. Try recording again; this did not use an attempt.'
}
