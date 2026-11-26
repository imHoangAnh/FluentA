import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { PracticeStep } from '../../api/practice.api'

const stepOrder: readonly PracticeStep[] = ['dictation', 'wordToMeaning', 'pronunciation', 'recap']

const stepDefinitions: ReadonlyArray<{
  key: PracticeStep
  number?: number
  label: string
}> = [
  { key: 'dictation', number: 1, label: 'Dictation' },
  { key: 'wordToMeaning', number: 2, label: 'Word to Meaning' },
  { key: 'pronunciation', number: 3, label: 'Pronunciation' },
  { key: 'recap', label: 'Recap' },
]

const stepLabels: Record<PracticeStep, string> = {
  dictation: 'Dictation',
  wordToMeaning: 'Word to Meaning',
  pronunciation: 'Pronunciation',
  recap: 'Recap',
}

const stepFractions: Record<PracticeStep, number> = {
  dictation: 0.25,
  wordToMeaning: 0.5,
  pronunciation: 0.75,
  recap: 1,
}

type PracticeProgressProps = {
  currentIndex: number
  totalCards: number
  step: PracticeStep
  onExit: () => void
}

export function PracticeProgress({ currentIndex, totalCards, step, onExit }: PracticeProgressProps) {
  const progress = totalCards > 0 ? Math.min(currentIndex + 1, totalCards) : 0
  const percent = totalCards > 0 ? Math.min(100, ((currentIndex + stepFractions[step]) / totalCards) * 100) : 0
  const countLabel = `Word ${progress} of ${totalCards}`
  const activeStepIndex = stepOrder.indexOf(step)
  const visibleSteps = step === 'recap'
    ? stepDefinitions
    : stepDefinitions.filter((item) => item.key !== 'recap')

  return (
    <div className="practice-figma-progress">
      <div className="practice-session-top">
        <button type="button" className="practice-exit-link" onClick={onExit}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Exit Practice</span>
        </button>

        <nav className="practice-stepper" aria-label="Practice steps">
          {visibleSteps.map((item) => {
            const itemIndex = stepOrder.indexOf(item.key)
            const status = itemIndex < activeStepIndex
              ? 'completed'
              : itemIndex === activeStepIndex
                ? 'active'
                : 'upcoming'

            return (
              <span
                key={item.key}
                className={`practice-stepper__step practice-stepper__step--${status}`}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {status === 'completed' ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                <span>
                  {status === 'completed' || !item.number ? item.label : `${item.number}\u00A0\u00A0${item.label}`}
                </span>
              </span>
            )
          })}
        </nav>

        <span className="practice-word-counter">{countLabel}</span>
      </div>

      <div
        className="practice-progress-bar"
        role="progressbar"
        aria-label={`${stepLabels[step]}, ${countLabel}`}
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={progress}
        aria-valuetext={countLabel}
      >
        <span className="practice-progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
