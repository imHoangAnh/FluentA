type ReviewCompletionProps = {
  orderLabel: string
  totalWords: number
  boardName: string
  correctCount: number
  wrongCount: number
  elapsedSeconds: number
  onDone: () => void
}

export function ReviewCompletion({ orderLabel, totalWords, boardName, correctCount, wrongCount, elapsedSeconds, onDone }: ReviewCompletionProps) {
  return (
    <section className="review-session learning-session--focused review-complete-session">
      <div className="review-progress">
        <div className="review-progress-header"><span className="review-progress-order">{orderLabel}</span><strong className="review-progress-count">{totalWords} of {totalWords}</strong></div>
        <progress value={totalWords} max={totalWords} />
      </div>
      <article className="review-card learning-card--focused review-summary-card">
        <div className="review-summary review-summary--focused" data-testid="review-summary">
          <header className="review-summary__header"><h1>{boardName}</h1><p>{correctCount} correct and {wrongCount} wrong across {correctCount + wrongCount} reviewed words.</p></header>
          <div className="practice-summary-stats-grid" aria-label="Review results">
            <div className="practice-stat-card practice-stat-card--correct"><span className="practice-stat-value">{correctCount}</span><span className="practice-stat-label">Correct</span></div>
            <div className="practice-stat-card practice-stat-card--wrong"><span className="practice-stat-value">{wrongCount}</span><span className="practice-stat-label">Wrong</span></div>
          </div>
          <footer className="review-summary__footer"><p className="text-sm text-muted-foreground">Session time: {elapsedSeconds} seconds.</p><button className="primary-button review-summary__done" type="button" onClick={onDone}>Done</button></footer>
        </div>
      </article>
    </section>
  )
}
