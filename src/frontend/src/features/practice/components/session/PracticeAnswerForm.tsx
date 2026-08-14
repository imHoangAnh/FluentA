import type { PracticeMode } from '../../api/practice.api'

type PracticeAnswerFormProps = {
  mode: Exclude<PracticeMode, 'pronunciation'>
  typedAnswer: string
  isResolved: boolean
  feedback: 'correct' | 'wrong' | null
  usesLargeAnswerLayout: boolean
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onSkip: () => void
  onContinue: () => void
}

export function PracticeAnswerForm({ mode, typedAnswer, isResolved, feedback, usesLargeAnswerLayout, onAnswerChange, onSubmit, onSkip, onContinue }: PracticeAnswerFormProps) {
  return (
    <div className="review-answer-form">
      <input
        id="practice-answer-input"
        value={typedAnswer}
        onChange={(event) => onAnswerChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && typedAnswer.trim().length > 0) {
            event.preventDefault()
            event.stopPropagation()
            onSubmit()
          }
        }}
        data-testid="practice-answer-input"
        placeholder={mode === 'meaningToWord' ? 'Type the word...' : 'Type your answer...'}
        disabled={isResolved}
      />
      {feedback === 'wrong' ? <p className="practice-wrong-message" role="status" aria-live="polite">Wrong, please try again</p> : null}
      <div className="review-exercise__actions">
        <button className={usesLargeAnswerLayout ? 'practice-dictation-submit' : 'review-skip-button review-submit-button'} type="button" title="Submit answer (Enter)" onClick={onSubmit} disabled={typedAnswer.trim().length === 0 || isResolved}>
          {mode === 'dictation' ? 'Submit Answer' : 'Submit'}
        </button>
        {!isResolved ? <button className={usesLargeAnswerLayout ? 'practice-dictation-skip' : 'review-skip-button'} type="button" onClick={onSkip}>Skip</button> : null}
        {isResolved ? <button className="primary-button review-submit-button" type="button" onClick={onContinue}>Continue</button> : null}
      </div>
    </div>
  )
}
