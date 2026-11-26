import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type PronunciationUnitFeedback = { text: string; correct: boolean; accuracyScore?: number | null }
export type PronunciationSyllableFeedback = {
  text: string
  accuracyScore: number
  phonemes: PronunciationUnitFeedback[]
}
export type PronunciationWordFeedback = {
  text: string
  accuracyScore: number
  errorType?: string | null
  units: PronunciationUnitFeedback[]
  syllables?: PronunciationSyllableFeedback[] | null
}
export type PronunciationAssessment = {
  correct: boolean
  accuracyScore: number
  completenessScore?: number | null
  feedbackMode: 'syllable' | 'phoneme' | 'word'
  words: PronunciationWordFeedback[]
}

export async function assessPronunciation(wordId: string, audio: Blob) {
  const response = await apiClient.post<ApiResponse<PronunciationAssessment>>(
    `/pronunciation/words/${wordId}/assessment`,
    audio,
    { headers: { 'Content-Type': 'audio/wav' } },
  )
  return response.data.data!
}

export function getPronunciationAssessmentErrorMessage(error: unknown) {
  const code = (error as { response?: { data?: ApiResponse<never> } }).response?.data?.errors?.[0]?.code
  if (code === 'PRONUNCIATION_NOT_RECOGNIZED') {
    return 'No speech was recognized. Try recording again; this did not use an attempt.'
  }

  return 'Pronunciation assessment is unavailable. Try recording again; this did not use an attempt.'
}
