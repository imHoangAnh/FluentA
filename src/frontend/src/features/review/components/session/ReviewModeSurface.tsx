import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReviewSessionItem } from '../../api/review.api'
import { hasText } from './reviewFormatters'

export type ReviewFeedback = {
  kind: 'correct' | 'wrong'
  item: ReviewSessionItem
}

type ReviewModeSurfaceProps = {
  item: ReviewSessionItem
  typedAnswer: string
  feedback: ReviewFeedback | null
  isBusy: boolean
  onAnswerChange: (value: string) => void
  onCheckAnswer: () => void
  onSkip: () => void
  onContinue: () => void
}

export function ReviewModeSurface({
  item,
  typedAnswer,
  feedback,
  isBusy,
  onAnswerChange,
  onCheckAnswer,
  onSkip,
  onContinue,
}: ReviewModeSurfaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasContext = hasText(item.context)
  const feedbackClass = feedback ? ` review-exercise--${feedback.kind}` : ''

  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus()
    }
  }, [feedback, item.itemId])

  return (
    <div className={`review-exercise${feedbackClass}`}>
      <div className="review-prompt-stack">
        <h2 className="review-exercise__prompt">
          {hasContext
            ? 'Read the meaning and context, type the word.'
            : 'Read the meaning, type the word.'}
        </h2>
      </div>

      <div className="review-meaning-card">
        <div className="review-meaning-block">
          <span className="review-meaning-label">MEANING</span>
          <p className="review-meaning-value">
            {hasText(item.meaning) ? item.meaning : 'No meaning was saved for this word.'}
          </p>
        </div>

        {hasContext ? (
          <div className="review-meaning-block">
            <span className="review-meaning-label">CONTEXT</span>
            <p className="review-meaning-value">{item.context}</p>
          </div>
        ) : null}
      </div>

      <div className="review-answer-input-wrap">
        <input
          ref={inputRef}
          id="review-answer-input"
          className="review-answer-input"
          aria-label="Type the word"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={typedAnswer}
          disabled={isBusy || Boolean(feedback)}
          placeholder="Type the word..."
          onChange={(event) => onAnswerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && typedAnswer.trim().length > 0 && !isBusy && !feedback) {
              event.preventDefault()
              event.stopPropagation()
              onCheckAnswer()
            }
          }}
        />
      </div>

      {feedback ? (
        <div
          className={`review-feedback-banner review-feedback-banner--${feedback.kind}`}
          role="status"
          aria-live="polite"
        >
          {feedback.kind === 'correct' ? (
            <>
              <CheckCircle2 size={16} aria-hidden="true" />
              <strong>Correct</strong>
              <span>Press Enter to continue.</span>
            </>
          ) : (
            <>
              <XCircle size={16} aria-hidden="true" />
              <strong>Not quite</strong>
              <span>
                Correct answer: <strong>{feedback.item.word}</strong>
              </span>
            </>
          )}
        </div>
      ) : null}

      <div className="review-action-row">
        {feedback ? (
          <>
            <span />
            <button
              className="review-btn-primary"
              type="button"
              onClick={onContinue}
              disabled={isBusy}
            >
              <span>Continue</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button
              className="review-btn-secondary"
              type="button"
              title="Skip this word (Esc)"
              onClick={onSkip}
              disabled={isBusy}
            >
              Skip
            </button>
            <button
              className="review-btn-primary"
              type="button"
              onClick={onCheckAnswer}
              disabled={isBusy || typedAnswer.trim().length === 0}
            >
              <span>Check Answer</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
