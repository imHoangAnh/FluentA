import { ArrowLeft } from 'lucide-react'

type ReviewProgressProps = {
  currentWord: number
  totalWords: number
  onExit: () => void
}

export function ReviewProgress({ currentWord, totalWords, onExit }: ReviewProgressProps) {
  const total = Math.max(totalWords, 1)
  const current = Math.min(Math.max(currentWord, 1), total)
  const percent = Math.min((current / total) * 100, 100)

  return (
    <div className="review-figma-progress" aria-label="Review progress">
      <div className="review-session-top">
        <button type="button" className="review-exit-link" onClick={onExit}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>End Review Session</span>
        </button>

        <div className="review-session-badges">
          <span className="review-due-badge">
            {current} / {totalWords} due today
          </span>
        </div>
      </div>

      <div
        className="review-progress-bar"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`${current} of ${totalWords} reviewed words`}
      >
        <span className="review-progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
