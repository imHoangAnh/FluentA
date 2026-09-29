import { CheckCircle2 } from 'lucide-react'

type ReviewCompletionProps = {
  totalWords: number
  correctCount: number
  wrongCount: number
  onDone: () => void
}

export function ReviewCompletion({ totalWords, correctCount, wrongCount, onDone }: ReviewCompletionProps) {
  return (
    <section className="review-figma-session__card review-figma-session__completion" data-testid="review-summary">
      <div className="review-figma-session__completion-content">
        <CheckCircle2 className="review-figma-session__completion-icon" aria-hidden="true" />
        <div className="review-figma-session__completion-copy">
          <h1>Review complete</h1>
          <p>You reviewed {totalWords} {totalWords === 1 ? 'word' : 'words'}.</p>
        </div>
        <div className="review-figma-session__results" aria-label="Review results">
          <div className="review-figma-session__result review-figma-session__result--correct">
            <strong>{correctCount}</strong>
            <span>Correct</span>
          </div>
          <div className="review-figma-session__result review-figma-session__result--wrong">
            <strong>{wrongCount}</strong>
            <span>Wrong</span>
          </div>
        </div>
        <button className="review-figma-session__done-button" type="button" onClick={onDone}>Done</button>
      </div>
    </section>
  )
}
