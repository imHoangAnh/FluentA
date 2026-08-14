type ReviewProgressProps = {
  orderLabel: string
  currentIndex: number
  totalWords: number
  focused: boolean
}

export function ReviewProgress({ orderLabel, currentIndex, totalWords, focused }: ReviewProgressProps) {
  return (
    <div className="review-progress">
      <div className="review-progress-header">
        <span className="review-progress-order">{orderLabel}</span>
        <strong className="review-progress-count">{focused ? `${currentIndex + 1} of ${totalWords}` : `${currentIndex + 1} / ${totalWords}`}</strong>
      </div>
      <progress value={currentIndex + 1} max={totalWords} />
    </div>
  )
}
