import { describe, expect, it } from 'vitest'
import { getPronunciationAssessmentErrorMessage } from './pronunciation.api'

describe('getPronunciationAssessmentErrorMessage', () => {
  it('distinguishes unrecognized speech from provider unavailability', () => {
    const unrecognized = {
      response: {
        data: {
          success: false,
          error: { code: 'PRONUNCIATION_NOT_RECOGNIZED', message: 'Server message' },
        },
      },
    }

    expect(getPronunciationAssessmentErrorMessage(unrecognized)).toBe(
      'No speech was recognized. Try recording again; this did not use an attempt.',
    )
    expect(getPronunciationAssessmentErrorMessage(new Error('network'))).toBe(
      'Pronunciation assessment is unavailable. Try recording again; this did not use an attempt.',
    )
  })
})
