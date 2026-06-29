import { ArrowLeft, ChevronLeft, ChevronRight, LogOut, RotateCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getLanguageProfile } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'

export function FlashcardViewerPage() {
  const { deckId = '' } = useParams()
  return <FlashcardViewerPageContent key={deckId} deckId={deckId} />
}

function FlashcardViewerPageContent({ deckId }: { deckId: string }) {
  const logout = useAuthStore((state) => state.logout)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['flashcard', 'deck-session', deckId],
    queryFn: () => flashcardApi.getDeckSession(deckId),
    enabled: Boolean(deckId),
  })

  const cards = sessionQuery.data?.cards ?? []
  const currentCard = cards[currentIndex] ?? null
  const secondaryMeaningLabel = getLanguageProfile(sessionQuery.data?.boardLanguage).secondaryMeaningLabel
  const isFinalCard = currentIndex + 1 >= cards.length

  const progressLabel = useMemo(() => {
    if (cards.length === 0) {
      return '0 / 0'
    }

    return `${currentIndex + 1} / ${cards.length}`
  }, [cards.length, currentIndex])

  function goPrevious() {
    setCurrentIndex((value) => Math.max(0, value - 1))
    setFlipped(false)
  }

  function goNext() {
    setCurrentIndex((value) => Math.min(cards.length - 1, value + 1))
    setFlipped(false)
  }

  return (
    <main className="workspace review-workspace flashcard-viewer-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Flashcard navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards">
            <ArrowLeft size={17} /> Back to decks
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      {sessionQuery.isLoading ? <p className="flashcard-status">Loading flashcard viewer...</p> : null}
      {sessionQuery.isError ? <p className="flashcard-status flashcard-status--error">This deck is unavailable.</p> : null}

      {sessionQuery.data && cards.length === 0 ? (
        <section className="review-setup">
          <span className="preview-label">Flashcard viewer</span>
          <h1>{sessionQuery.data.deckName}</h1>
          <p>This page deck has no synchronized words yet.</p>
          <Link className="primary-button" to="/flashcards">Finish</Link>
        </section>
      ) : null}

      {sessionQuery.data && currentCard ? (
        <section className="flashcard-viewer">
          <div className="review-progress flashcard-viewer__progress">
            <div>
              <span className="preview-label">Flashcard</span>
              <strong>{progressLabel}</strong>
            </div>
            <progress value={cards.length === 0 ? 0 : currentIndex + 1} max={Math.max(cards.length, 1)} />
          </div>

          <div className="flashcard-viewer__header">
            <div>
              <span className="preview-label">Page deck</span>
              <h1>{sessionQuery.data.deckName}</h1>
            </div>
            <p>Click the card to flip between prompt and answer.</p>
          </div>

          <button
            className={flipped ? 'flashcard-stage flashcard-stage--flipped' : 'flashcard-stage'}
            type="button"
            onClick={() => setFlipped((value) => !value)}
            data-testid="flashcard-stage"
          >
            {!flipped ? (
              <div className="flashcard-stage__face flashcard-stage__face--front">
                <span>{currentCard.wordClass}</span>
                <h2>{currentCard.word}</h2>
                {currentCard.meaningEn ? <p>{currentCard.meaningEn}</p> : null}
                <small><RotateCw size={14} /> Click to flip</small>
              </div>
            ) : (
              <div className="flashcard-stage__face flashcard-stage__face--back">
                <div>
                  <span>Vietnamese</span>
                  <strong>{currentCard.meaningVn}</strong>
                </div>
                <div>
                  <span>{secondaryMeaningLabel}</span>
                  <p>{currentCard.meaningEn}</p>
                </div>
                <div>
                  <span>Example</span>
                  <p>{currentCard.example}</p>
                </div>
                {currentCard.thesaurus ? (
                  <div>
                    <span>Thesaurus</span>
                    <p>{currentCard.thesaurus}</p>
                  </div>
                ) : null}
                <small><RotateCw size={14} /> Click to flip</small>
              </div>
            )}
          </button>

          <div className="flashcard-viewer__controls">
            <button className="secondary-button" type="button" onClick={goPrevious} disabled={currentIndex === 0}>
              <ChevronLeft size={16} /> Previous
            </button>
            {isFinalCard ? (
              <div className="flashcard-viewer__final-actions">
                <Link className="secondary-button" to="/flashcards">Finish</Link>
                <Link className="primary-button" to={`/flashcards/decks/${deckId}/practice`}>Let's practice</Link>
              </div>
            ) : (
              <button className="primary-button" type="button" onClick={goNext}>
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}
