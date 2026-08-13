import type { PronunciationAssessment } from '../pronunciation.api'

function cleanUnitText(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

export function PronunciationFeedback({ assessment }: { assessment: PronunciationAssessment | null }) {
  if (!assessment || assessment.correct || assessment.words.length === 0) return null

  return (
    <div className="pronunciation-feedback-row" role="status" aria-live="polite" data-testid="pronunciation-feedback">
      {assessment.words.map((word, wordIndex) => (
        <span className="pronunciation-feedback-word" key={`${word.text}-${wordIndex}`}>
          {word.units.map((unit, unitIndex) => (
            <span
              className={`pronunciation-feedback-unit ${unit.correct ? 'pronunciation-feedback-unit--correct' : 'pronunciation-feedback-unit--wrong'}`}
              key={`${unit.text}-${unitIndex}`}
              aria-label={`${unit.correct ? 'Correct' : 'Needs practice'} pronunciation ${unit.text}`}
            >
              {assessment.feedbackMode === 'phoneme' ? `/${cleanUnitText(unit.text)}/` : unit.text}
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}
