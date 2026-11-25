import { ArrowLeft, CheckCircle2 } from 'lucide-react'

type ReviewCompletionProps = {
  totalWords: number
  correctCount: number
  wrongCount: number
  onDone: () => void
}

export function ReviewCompletion({ totalWords, correctCount, wrongCount, onDone }: ReviewCompletionProps) {
  const accuracy = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0

  return (
    <div className="review-completion-stage">
      <div className="review-figma-progress" aria-label="Review completion progress">
        <div className="review-session-top">
          <button type="button" className="review-exit-link" onClick={onDone}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to Dashboard</span>
          </button>

          <div className="review-session-badges">
            <span className="review-due-badge">
              {totalWords} / {totalWords} completed
            </span>
          </div>
        </div>

        <div
          className="review-progress-bar"
          role="progressbar"
          aria-valuenow={totalWords}
          aria-valuemin={0}
          aria-valuemax={Math.max(totalWords, 1)}
          aria-label={`${totalWords} of ${totalWords} completed`}
        >
          <span className="review-progress-bar__fill" style={{ width: '100%' }} />
        </div>
      </div>

      <section className="review-figma-session__card review-completion-card" data-testid="review-summary">
        <div className="review-completion-header">
          <div className="review-completion-header__left">
            <span className="review-done-icon-circle" aria-hidden="true">
              <CheckCircle2 size={26} />
            </span>
            <div className="review-completion-copy">
              <h1>Review Complete</h1>
              <p>
                You reviewed {totalWords} {totalWords === 1 ? 'word' : 'words'} today. Your memory schedule has been updated.
              </p>
            </div>
          </div>

          <span className="review-accuracy-pill">{accuracy}% Accuracy</span>
        </div>

        <div className="review-kpi-row" aria-label="Review results">
          <div className="review-kpi-card review-kpi-card--correct">
            <strong>{correctCount}</strong>
            <span>Correct</span>
          </div>
          <div className="review-kpi-card review-kpi-card--wrong">
            <strong>{wrongCount}</strong>
            <span>Wrong</span>
          </div>
        </div>

        <div className="review-action-row">
          <button className="review-btn-primary review-btn-done" type="button" onClick={onDone}>
            Done
          </button>
        </div>
      </section>

      <p className="review-figma-session__shortcuts" aria-label="Keyboard shortcuts">
        Shortcuts: <kbd>[Enter]</kbd> Done &amp; Return
      </p>
    </div>
  )
}
