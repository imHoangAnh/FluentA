import { ArrowRight, Volume2 } from 'lucide-react'
import type { PracticeReviewLevel, PracticeReviewStatus, PracticeSessionItem } from '../../api/practice.api'
import { formatIpa, formatWordType, hasText } from './practiceFormatters'

const reviewLevels: ReadonlyArray<{ level: PracticeReviewLevel; label: string }> = [
  { level: 0, label: 'New' },
  { level: 1, label: 'Forgot' },
  { level: 2, label: 'Uncertain' },
  { level: 3, label: 'Remembered' },
  { level: 4, label: 'Recalled' },
  { level: 5, label: 'Mastered' },
]

type PracticeRecapProps = {
  item: PracticeSessionItem
  isLastItem: boolean
  reviewStatus: PracticeReviewStatus | null
  isSaving: boolean
  saveError: boolean
  selectedLevel: PracticeReviewLevel | null
  onPlayAudio: () => void
  onSelectLevel: (level: PracticeReviewLevel) => void
  onConfirmNext: () => void
  onSkip: () => void
}

export function PracticeRecap({
  item,
  isLastItem,
  reviewStatus,
  isSaving,
  saveError,
  selectedLevel,
  onPlayAudio,
  onSelectLevel,
  onConfirmNext,
  onSkip,
}: PracticeRecapProps) {
  const activeInReview = reviewStatus === 'alreadyInReview' || item.alreadyInReview
  const levelsDisabled = isSaving || activeInReview || reviewStatus === 'added'
  const currentSelection = selectedLevel ?? item.selectedLevel
  const wordType = hasText(item.type) ? formatWordType(item.type) : ''
  const ipa = hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation) : ''

  return (
    <div className="practice-recap">
      <div className="practice-prompt-stack">
        <span className="practice-eyebrow practice-eyebrow--teal">WORD RECAP</span>
      </div>

      <div className="practice-recap-summary">
        <header className="practice-recap-summary__header">
          <div className="practice-recap-summary__word">
            <h3>{item.word}</h3>
            {wordType ? <span className="practice-pos-badge">{wordType}</span> : null}
            {ipa ? <span className="practice-ipa">{ipa}</span> : null}
          </div>

          <button
            className="practice-pill-btn practice-pill-btn--listen-compact"
            type="button"
            aria-label="Listen to pronunciation"
            aria-keyshortcuts="Tab"
            onClick={onPlayAudio}
          >
            <Volume2 size={15} aria-hidden="true" />
            <span>Listen</span>
          </button>
        </header>

        <div className="practice-stage-divider" aria-hidden="true" />

        <div className="practice-recap-details">
          {hasText(item.meaning) ? (
            <div className="practice-recap-details__row">
              <span className="practice-detail-label">MEANING</span>
              <p className="practice-recap-meaning">{item.meaning}</p>
            </div>
          ) : null}
          {hasText(item.context) ? (
            <div className="practice-recap-details__row">
              <span className="practice-detail-label">USAGE CONTEXT</span>
              <p className="practice-recap-context">{item.context}</p>
            </div>
          ) : null}
          {hasText(item.example) ? (
            <div className="practice-recap-details__row">
              <span className="practice-detail-label">EXAMPLE</span>
              <p className="practice-recap-example">{item.example}</p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="practice-recap-levels-section" aria-label="Choose a review level">
        <p className="practice-recap-question">How well did you recall this word?</p>
        <div className="practice-recap-levels" role="group" aria-label="Choose initial review level">
          {reviewLevels.map(({ level, label }) => {
            const isSelected = currentSelection === level
            return (
              <button
                key={level}
                className={`practice-level-btn${isSelected ? ' practice-level-btn--selected' : ''}`}
                type="button"
                onClick={() => onSelectLevel(level)}
                disabled={levelsDisabled}
                aria-pressed={isSelected}
                aria-keyshortcuts={String(level)}
                data-level={level}
                data-testid={`practice-review-level-${level}`}
                title={`Select level ${level}: ${label}`}
              >
                <span className="practice-level-num">{level}</span>
                <span className="practice-level-label">{label}</span>
              </button>
            )
          })}
        </div>

        {activeInReview ? (
          <p className="practice-recap-status" role="status">
            <span aria-hidden="true" className="practice-recap-status__dot" />
            Already in review
          </p>
        ) : null}
        {reviewStatus === 'added' ? <p className="practice-recap-status" role="status">Added to Review</p> : null}
        {isSaving ? <p className="practice-recap-status" role="status" aria-live="polite">Saving practice progress…</p> : null}
        {saveError ? <p className="practice-recap-error" role="alert">Unable to save this practice result. Try again.</p> : null}
      </section>

      <div className="practice-action-row" data-testid="practice-recap-actions" aria-busy={isSaving}>
        <button
          className="practice-btn-secondary"
          type="button"
          onClick={onSkip}
          disabled={isSaving}
          aria-label="Skip recap"
        >
          Skip
        </button>
        <button
          className="practice-btn-primary"
          type="button"
          onClick={onConfirmNext}
          disabled={isSaving || (!activeInReview && currentSelection == null)}
        >
          <span>{isLastItem ? 'Finish Practice' : 'Next Word'}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
