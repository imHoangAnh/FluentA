import { ArrowLeft, CheckCircle2, LogOut, Shuffle, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardCard, ReviewRating } from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'

type StudyMode = 'spaced' | 'normal' | 'shuffle'
type RatingLabel = 'Easy' | 'Good' | 'Hard' | 'Again'

const ratings: { label: RatingLabel; key: string; value: ReviewRating }[] = [
  { label: 'Easy', key: '1', value: 3 },
  { label: 'Good', key: '2', value: 2 },
  { label: 'Hard', key: '3', value: 1 },
  { label: 'Again', key: '4', value: 0 },
]

function shuffleCards(cards: FlashcardCard[]) {
  const result = [...cards]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function Summary({
  deckName,
  counts,
  elapsedSeconds,
  spaced,
}: {
  deckName: string
  counts: Record<RatingLabel, number>
  elapsedSeconds: number
  spaced: boolean
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  return (
    <section className="review-summary" data-testid="review-summary">
      <CheckCircle2 size={38} />
      <span className="preview-label">Session complete</span>
      <h1>{spaced ? 'Great work! All cards reviewed for today.' : `Nice work on ${deckName}`}</h1>
      <p>{total} cards reviewed in {minutes}:{seconds.toString().padStart(2, '0')} · {total ? Math.round(elapsedSeconds / total) : 0}s average per card.</p>
      <div className="review-summary__ratings">
        {ratings.map(({ label }) => (
          <div key={label}>
            <strong>{counts[label]}</strong>
            <span>{label}</span>
            <small>{total ? Math.round((counts[label] / total) * 100) : 0}%</small>
          </div>
        ))}
      </div>
      <Link className="primary-button review-summary__done" to="/flashcards">Done</Link>
    </section>
  )
}

export function ReviewSessionPage() {
  const { deckId = '' } = useParams()
  const logout = useAuthStore((state) => state.logout)
  const [mode, setMode] = useState<StudyMode | null>(null)
  const [cards, setCards] = useState<FlashcardCard[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [dueDeck, setDueDeck] = useState<flashcardApi.DueDeck | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [counts, setCounts] = useState<Record<RatingLabel, number>>({ Easy: 0, Good: 0, Hard: 0, Again: 0 })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionStartedAt = useRef(0)
  const cardStartedAt = useRef(0)

  const sessionQuery = useQuery({
    queryKey: ['flashcard', 'deck-session', deckId],
    queryFn: () => flashcardApi.getDeckSession(deckId),
    enabled: Boolean(deckId),
  })

  const selectedMode = mode ?? (sessionQuery.data?.deckType === 'AllWords' ? 'spaced' : 'normal')

  const currentCard = cards?.[currentIndex] ?? null
  const languageProfile = getLanguageProfile(sessionQuery.data?.boardLanguage)

  const reviewMutation = useMutation({
    mutationFn: flashcardApi.submitReview,
  })

  useEffect(() => {
    if (currentCard && cards) {
      cardStartedAt.current = Date.now()
      speakWord(currentCard.word, sessionQuery.data?.boardLanguage ?? 'en')
    }
  }, [cards, currentCard, sessionQuery.data?.boardLanguage])

  async function startSession() {
    setSessionError(null)
    let source = sessionQuery.data?.cards ?? []
    let createdSession: flashcardApi.ReviewSessionCreated
    try {
      createdSession = await flashcardApi.createReviewSession(deckId)
    } catch {
      setSessionError('Unable to start this review session. Try again.')
      return
    }

    if (selectedMode === 'spaced') {
      try {
        const due = await flashcardApi.getDueDeck(deckId, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
        setDueDeck(due)
        source = due.cards
      } catch {
        setSessionError('Unable to build your Spaced queue. Try again.')
        return
      }
    } else {
      setDueDeck(null)
    }
    sessionIdRef.current = createdSession.sessionId
    setSessionId(createdSession.sessionId)
    setCards(selectedMode === 'shuffle' ? shuffleCards(source) : [...source])
    setCurrentIndex(0)
    setRevealed(false)
    setCompleted(source.length === 0)
    setElapsedSeconds(0)
    setCounts({ Easy: 0, Good: 0, Hard: 0, Again: 0 })
    sessionStartedAt.current = Date.now()
    cardStartedAt.current = Date.now()
  }

  const rateCard = useCallback(async (label: RatingLabel, rating: ReviewRating) => {
    const activeSessionId = sessionIdRef.current ?? sessionId
    if (!currentCard || !revealed || !activeSessionId || reviewMutation.isPending) return

    try {
      await reviewMutation.mutateAsync({
        sessionId: activeSessionId,
        cardId: currentCard.id,
        rating,
        timeSpentSeconds: Math.max(0, Math.round((Date.now() - cardStartedAt.current) / 1000)),
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
    } catch {
      return
    }
    setCounts((current) => ({ ...current, [label]: current[label] + 1 }))

    if (currentIndex + 1 >= (cards?.length ?? 0)) {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - sessionStartedAt.current) / 1000)))
      setCompleted(true)
      return
    }

    setCurrentIndex((index) => index + 1)
    setRevealed(false)
  }, [cards?.length, currentCard, currentIndex, revealed, reviewMutation, sessionId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!cards || completed) return

      if (event.code === 'Space') {
        event.preventDefault()
        setRevealed(true)
        return
      }

      if (!revealed) return
      const rating = ratings.find((item) => item.key === event.key)
      if (rating) {
        event.preventDefault()
        void rateCard(rating.label, rating.value)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cards, completed, rateCard, revealed])

  return (
    <main className="workspace review-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Review navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards">
            <ArrowLeft size={17} /> Leave session
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      {sessionQuery.isLoading ? <p className="flashcard-status">Loading deck...</p> : null}
      {sessionQuery.isError ? <p className="flashcard-status flashcard-status--error">This deck is unavailable.</p> : null}

      {sessionQuery.data && !cards && !completed ? (
        <section className="review-setup">
          <span className="preview-label">
            {sessionQuery.data.deckType === 'AllWords' ? 'All Words SM-2 Review' : 'Page Deck Active Recall'}
          </span>
          <h1>{sessionQuery.data.deckName}</h1>
          <p>
            {sessionQuery.data.deckType === 'AllWords'
              ? 'Choose an order. Every rating updates this card’s spaced-repetition schedule.'
              : 'Choose an order. Ratings are recorded for your summary without changing spaced-repetition progress.'}
          </p>
          <div className="review-mode-options" role="group" aria-label="Study mode">
            {sessionQuery.data.deckType === 'AllWords' ? (
              <button className={selectedMode === 'spaced' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setMode('spaced')}>
                Spaced <small>Study overdue, due-today, then new cards within your daily limits.</small>
              </button>
            ) : null}
            <button className={selectedMode === 'normal' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setMode('normal')}>
              Normal <small>Study cards in their saved order.</small>
            </button>
            <button className={selectedMode === 'shuffle' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setMode('shuffle')}>
              <Shuffle size={18} /> Shuffle <small>Mix the order for a fresh recall pass.</small>
            </button>
          </div>
          <button className="primary-button review-start" type="button" onClick={() => void startSession()} data-testid="start-review-session">
            Start {selectedMode} session · {sessionQuery.data.cards.length} cards
          </button>
          {sessionError ? <p className="flashcard-status flashcard-status--error">{sessionError}</p> : null}
        </section>
      ) : null}

      {completed && sessionQuery.data && !(selectedMode === 'spaced' && cards?.length === 0) ? (
        <Summary deckName={sessionQuery.data.deckName} counts={counts} elapsedSeconds={elapsedSeconds} spaced={selectedMode === 'spaced'} />
      ) : null}

      {cards && currentCard && !completed ? (
        <section className="review-session">
          <div className="review-progress">
            <div>
              <span className="preview-label">
                {selectedMode} · {sessionQuery.data?.deckType === 'AllWords' ? 'All Words' : 'Page Deck'}
              </span>
              <strong>{currentIndex + 1} / {cards.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={cards.length} />
          </div>

          <article className={revealed ? 'review-card review-card--revealed' : 'review-card'} data-testid="active-review-card">
            <div className="review-card__front">
              <span>{currentCard.wordClass}</span>
              <h1>{currentCard.word}</h1>
              <button className="icon-button" type="button" aria-label="Play pronunciation" onClick={() => speakWord(currentCard.word, sessionQuery.data?.boardLanguage ?? 'en')}>
                <Volume2 size={18} />
              </button>
            </div>

            {revealed ? (
              <div className="review-card__answer" data-testid="review-answer">
                <div><span>Vietnamese</span><strong>{currentCard.meaningVn}</strong></div>
                <div><span>{languageProfile.secondaryMeaningLabel}</span><p>{currentCard.meaningEn}</p></div>
                <div><span>Example</span><p>{currentCard.example}</p></div>
                {currentCard.thesaurus ? <div><span>Thesaurus</span><p>{currentCard.thesaurus}</p></div> : null}
                {currentCard.collocation ? <div><span>Collocation</span><p>{currentCard.collocation}</p></div> : null}
                {currentCard.note ? <div><span>Note</span><p>{currentCard.note}</p></div> : null}
              </div>
            ) : (
              <button className="primary-button review-reveal" type="button" onClick={() => setRevealed(true)} data-testid="show-answer">
                Show answer <span>Space</span>
              </button>
            )}
          </article>

          {revealed ? (
            <div className="review-ratings" aria-label="Rate your recall">
              {ratings.map((rating) => (
                <button
                  className={`review-rating review-rating--${rating.label.toLowerCase()}`}
                  type="button"
                  key={rating.label}
                  disabled={reviewMutation.isPending}
                  onClick={() => void rateCard(rating.label, rating.value)}
                >
                  <kbd>{rating.key}</kbd> {rating.label}
                </button>
              ))}
            </div>
          ) : null}
          {reviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this rating. Try again.</p> : null}
        </section>
      ) : null}

      {cards && cards.length === 0 && completed && selectedMode === 'spaced' ? (
        <section className="review-summary" data-testid="all-done-today">
          <CheckCircle2 size={38} />
          <span className="preview-label">Spaced review complete</span>
          <h1>Great work! All cards reviewed for today.</h1>
          <p>{dueDeck ? `${dueDeck.newCards.remaining} new and ${dueDeck.reviews.remaining} review slots remain.` : 'Your due queue is clear.'}</p>
          <Link className="primary-button review-summary__done" to="/flashcards">Done</Link>
        </section>
      ) : null}
    </main>
  )
}
