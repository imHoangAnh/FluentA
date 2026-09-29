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
  reviewStatus: PracticeReviewStatus | null
  isSaving: boolean
  saveError: boolean
  onSelectLevel: (level: PracticeReviewLevel) => void
  onSkip: () => void
}

export function PracticeRecap({ item, reviewStatus, isSaving, saveError, onSelectLevel, onSkip }: PracticeRecapProps) {
  const activeInReview = reviewStatus === 'alreadyInReview' || item.alreadyInReview
  const levelsDisabled = isSaving || activeInReview || reviewStatus === 'added'
  const wordDetails = [hasText(item.type) ? formatWordType(item.type) : '', hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation) : '']
    .filter(Boolean)
    .join('  ·  ')

  return (
    <div className="practice-recap">
      <h2 className="practice-exercise__prompt">Review the word and choose how well you remember it.</h2>

      <div className="practice-session-recap__content">
        <header className="practice-session-recap__word">
          <h3>{item.word}</h3>
          {wordDetails ? <p>{wordDetails}</p> : null}
        </header>

        <div className="practice-session-recap__details">
          {hasText(item.meaning) ? <div><span>Meaning</span><p>{item.meaning}</p></div> : null}
          {hasText(item.context) ? <div><span>Usage context</span><p>{item.context}</p></div> : null}
          {hasText(item.example) ? <div><span>Example</span><p className="practice-session-recap__example">{item.example}</p></div> : null}
        </div>
      </div>

      <section className="practice-session-recap__levels-section" aria-label="Choose a review level">
        <p className="practice-session-recap__question">How well did you recall this word?</p>
        <div className="practice-session-recap__levels" role="group" aria-label="Choose initial review level">
          {reviewLevels.map(({ level, label }) => (
            <button
              key={level}
              className="practice-session-recap__level-button"
              type="button"
              onClick={() => onSelectLevel(level)}
              disabled={levelsDisabled}
              aria-pressed={item.selectedLevel === level}
              data-level={level}
              data-testid={`practice-review-level-${level}`}
              title={`Add to Review as ${label}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeInReview ? (
          <p className="practice-session-recap__pool-status" role="status">
            <span aria-hidden="true" className="practice-session-recap__status-dot" />
            Already in review
          </p>
        ) : null}
        {reviewStatus === 'added' ? <p className="practice-session-recap__pool-status" role="status">Added to Review</p> : null}
        {isSaving ? <p className="practice-session-recap__pool-status" role="status" aria-live="polite">Saving practice progress…</p> : null}
      </section>

      <div className="practice-session-recap__actions" data-testid="practice-recap-actions" aria-busy={isSaving}>
        <button type="button" onClick={onSkip} disabled={isSaving} aria-label="Skip recap">Skip</button>
      </div>

      {saveError ? <p className="practice-session-recap__error" role="alert">Unable to save this practice result. Try again.</p> : null}
    </div>
  )
}
