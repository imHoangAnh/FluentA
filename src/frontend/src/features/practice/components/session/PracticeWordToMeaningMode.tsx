import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { PracticeSessionItem } from '../../api/practice.api'
import { formatIpa, formatWordType, hasText } from './practiceFormatters'

type PracticeWordToMeaningModeProps = {
  item: PracticeSessionItem
  selectedSlotId: string | null
  isResolved: boolean
  isBusy: boolean
  feedback: 'correct' | 'wrong' | null
  onSelect: (slotId: string) => void
}

export function PracticeWordToMeaningMode({ item, selectedSlotId, isResolved, isBusy, feedback, onSelect }: PracticeWordToMeaningModeProps) {
  const slots = Array.from({ length: 4 }, (_, index) => item.answerSlots[index] ?? { slotId: `empty-${index}`, meaning: null })
  const hasContext = hasText(item.context)
  const wordType = hasText(item.type) ? formatWordType(item.type) : ''
  const ipa = hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation) : ''

  return (
    <div className="practice-word-meaning">
      <div className="practice-word-hero">
        <div className="practice-word-hero__row">
          <div className="practice-word-hero__title">
            <strong>{item.word}</strong>
            {wordType ? <span className="practice-pos-badge">{wordType}</span> : null}
          </div>
          {ipa ? <span className="practice-ipa">{ipa}</span> : null}
        </div>
        {hasContext ? (
          <div className="practice-word-hero__context">
            <span className="practice-detail-label">CONTEXT</span>
            <p>{item.context}</p>
          </div>
        ) : null}
      </div>

      <div className="practice-word-meaning__choices" role="group" aria-label={`Meanings for ${item.word}`}>
        {slots.map((slot, index) => {
          const isSelected = selectedSlotId === slot.slotId
          const isEmpty = !slot.meaning?.trim()
          const stateClass = isSelected && feedback === 'wrong'
            ? ' practice-word-meaning__choice--wrong'
            : isSelected && feedback === 'correct'
              ? ' practice-word-meaning__choice--correct'
              : isSelected
                ? ' practice-word-meaning__choice--selected'
                : ''

          return (
            <button
              key={slot.slotId}
              type="button"
              disabled={isEmpty || isResolved || isBusy}
              aria-pressed={isSelected}
              aria-keyshortcuts={String(index + 1)}
              aria-label={isEmpty ? `Option ${index + 1}, no answer available` : `Option ${index + 1}: ${slot.meaning}`}
              onClick={() => onSelect(slot.slotId)}
              className={`practice-word-meaning__choice${isEmpty ? ' practice-word-meaning__choice--empty' : ''}${stateClass}`}
            >
              <span className="practice-word-meaning__radio" aria-hidden="true">
                {isSelected && feedback === 'correct'
                  ? <CheckCircle2 size={18} />
                  : isSelected && feedback === 'wrong'
                    ? <XCircle size={18} />
                    : <Circle size={18} strokeWidth={1.5} />}
              </span>
              <span className="practice-word-meaning__choice-text">{isEmpty ? '' : slot.meaning}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
