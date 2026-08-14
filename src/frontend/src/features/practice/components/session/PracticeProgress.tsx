type PracticeProgressProps = {
  orderLabel: string
  currentIndex: number
  totalCards: number
}

export function PracticeProgress({ orderLabel, currentIndex, totalCards }: PracticeProgressProps) {
  return (
    <div className="review-progress">
      <div className="review-progress-header">
        <span className="review-progress-order">{orderLabel}</span>
        <strong className="review-progress-count">{currentIndex + 1} of {totalCards}</strong>
      </div>
      <progress value={currentIndex + 1} max={totalCards} />
    </div>
  )
}
