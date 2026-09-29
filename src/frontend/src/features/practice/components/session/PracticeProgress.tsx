import type { PracticeStep } from '../../api/practice.api'

const stepLabels: Record<PracticeStep, string> = {
  dictation: 'Dictation',
  wordToMeaning: 'Word to meaning',
  pronunciation: 'Pronunciation',
  recap: 'Recap',
}

type PracticeProgressProps = {
  currentIndex: number
  totalCards: number
  step: PracticeStep
}

export function PracticeProgress({ currentIndex, totalCards, step }: PracticeProgressProps) {
  const progress = totalCards > 0 ? Math.min(currentIndex + 1, totalCards) : 0
  const percent = totalCards > 0 ? (progress / totalCards) * 100 : 0
  const countLabel = `${progress} of ${totalCards} words`

  return (
    <div className="practice-figma-progress">
      <div className="practice-figma-progress__labels">
        <span>{stepLabels[step]}</span>
        <strong>{countLabel}</strong>
      </div>
      <div className="practice-figma-progress__track" role="progressbar" aria-label={`${stepLabels[step]}, ${countLabel}`} aria-valuemin={0} aria-valuemax={totalCards} aria-valuenow={progress} aria-valuetext={countLabel}>
        <span className="practice-figma-progress__value" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
