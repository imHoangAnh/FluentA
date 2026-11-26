import type { ReviewMode } from '../../api/review.api'

type ReviewProgressProps = {
  mode: ReviewMode
  currentWord: number
  totalWords: number
}

const labels: Record<ReviewMode, string> = {
  dictation: 'Dictation',
  meaningToWord: 'Meaning to word',
  listenAndRepeat: 'Pronunciation',
}

export function ReviewProgress({ mode, currentWord, totalWords }: ReviewProgressProps) {
  const current = Math.min(Math.max(currentWord, 1), Math.max(totalWords, 1))
  const total = Math.max(totalWords, 1)

  return (
    <div className="review-figma-session__progress" aria-label="Review progress">
      <div className="review-figma-session__progress-labels">
        <span>{labels[mode]}</span>
        <strong>{current} of {totalWords} {totalWords === 1 ? 'word' : 'words'}</strong>
      </div>
      <div className="review-figma-session__progress-track" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={`${current} of ${totalWords} reviewed words`}>
        <span className="review-figma-session__progress-value" style={{ width: `${Math.min((current / total) * 100, 100)}%` }} />
      </div>
    </div>
  )
}
