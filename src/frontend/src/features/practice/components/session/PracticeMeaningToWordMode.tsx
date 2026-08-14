import type { FlashcardCard } from '@/features/flashcards'
import { hasText } from './practiceFormatters'

type PracticeMeaningToWordModeProps = {
  card: FlashcardCard
}

export function PracticeMeaningToWordMode({ card }: PracticeMeaningToWordModeProps) {
  return (
    <div className="review-exercise__stage review-meaning-card">
      {hasText(card.meaningVn) ? <strong>{card.meaningVn}</strong> : null}
      {hasText(card.meaningEn) ? <p>{card.meaningEn}</p> : null}
    </div>
  )
}
