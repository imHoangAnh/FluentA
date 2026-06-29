import { ArrowLeft, CheckCircle2, LogOut, Shuffle, Volume2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function groupBoards(decks: flashcardApi.FlashcardDeck[]) {
  const grouped = new Map<string, { boardId: string; boardName: string; boardLanguage: string; wordCount: number }>()
  for (const deck of decks) {
    const current = grouped.get(deck.boardId) ?? {
      boardId: deck.boardId,
      boardName: deck.boardName,
      boardLanguage: deck.boardLanguage,
      wordCount: 0,
    }
    current.wordCount += deck.cards.length
    grouped.set(deck.boardId, current)
  }

  return [...grouped.values()]
}

export function ReviewSessionPage() {
  const logout = useAuthStore((state) => state.logout)
  const [boardId, setBoardId] = useState('')
  const [orderType, setOrderType] = useState<flashcardApi.ReviewOrderType>('sequential')
  const [mode, setMode] = useState<flashcardApi.ReviewMode>('dictation')
  const [session, setSession] = useState<flashcardApi.ReviewSessionCreated | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<boolean | null>(null)
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0)
  const sessionStartedAt = useRef(0)
  const cardStartedAt = useRef(0)

  const decksQuery = useQuery({ queryKey: ['flashcard', 'decks'], queryFn: flashcardApi.listDecks })
  const reviewSettingsQuery = useQuery({ queryKey: ['flashcard', 'settings'], queryFn: flashcardApi.getReviewSettings })
  const boards = useMemo(() => groupBoards(decksQuery.data ?? []), [decksQuery.data])
  const activeBoard = boards.find((item) => item.boardId === boardId) ?? null
  const words = session?.words ?? []
  const currentWord = words[currentIndex] ?? null
  const recapAfterAnswer = reviewSettingsQuery.data?.recapAfterAnswer ?? true

  const startSessionMutation = useMutation({
    mutationFn: flashcardApi.createReviewSession,
    onSuccess: (result) => {
      setSession(result)
      setCurrentIndex(0)
      setRevealed(false)
      setCorrectCount(0)
      setWrongCount(0)
      setLastOutcome(null)
      setCompletedElapsedSeconds(0)
      sessionStartedAt.current = Date.now()
      cardStartedAt.current = Date.now()
    },
  })

  const submitReviewMutation = useMutation({ mutationFn: flashcardApi.submitReview })

  useEffect(() => {
    if (currentWord && activeBoard) {
      speakWord(currentWord.word, activeBoard.boardLanguage)
      cardStartedAt.current = Date.now()
    }
  }, [activeBoard, currentWord])

  function resetForNextWord() {
    setRevealed(false)
    setLastOutcome(null)
    setCurrentIndex((value) => value + 1)
  }

  async function answer(correct: boolean) {
    if (!session || !currentWord || submitReviewMutation.isPending) return

    await submitReviewMutation.mutateAsync({
      sessionId: session.sessionId,
      cardId: currentWord.cardId,
      correct,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - cardStartedAt.current) / 1000)),
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })

    if (correct) {
      setCorrectCount((value) => value + 1)
    } else {
      setWrongCount((value) => value + 1)
    }

    if (currentIndex + 1 >= words.length) {
      setCompletedElapsedSeconds(Math.max(0, Math.round((Date.now() - sessionStartedAt.current) / 1000)))
      setLastOutcome(correct)
      return
    }

    if (correct && !recapAfterAnswer) {
      resetForNextWord()
      return
    }

    setLastOutcome(correct)
    setRevealed(true)
  }

  const completed = Boolean(session) && currentIndex + 1 >= words.length && lastOutcome !== null

  return (
    <main className="workspace review-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Review navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards">
            <ArrowLeft size={17} /> Back to flashcards
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      {!session ? (
        <section className="review-setup">
          <span className="preview-label">Board Review</span>
          <h1>Review due words by board</h1>
          <p>Select one board, choose queue order and review mode, then FluentA will load only overdue and due-today words.</p>
          <div className="settings-form">
            <label>
              Vocabulary board
              <select value={boardId} onChange={(event) => setBoardId(event.target.value)}>
                <option value="">Select a board</option>
                {boards.map((board) => (
                  <option key={board.boardId} value={board.boardId}>
                    {board.boardName} ({board.wordCount} words)
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="review-mode-options" role="group" aria-label="Review order">
            <button className={orderType === 'sequential' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setOrderType('sequential')}>
              Sequential <small>Oldest due words first.</small>
            </button>
            <button className={orderType === 'shuffle' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setOrderType('shuffle')}>
              <Shuffle size={18} /> Shuffle <small>Shuffle within the oldest-due limited set.</small>
            </button>
          </div>
          <div className="review-mode-options" role="group" aria-label="Review mode">
            {(['dictation', 'meaningToWord', 'pronunciation', 'random'] as flashcardApi.ReviewMode[]).map((candidate) => (
              <button key={candidate} className={mode === candidate ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setMode(candidate)}>
                {candidate === 'meaningToWord' ? 'Meaning -> Word' : candidate[0].toUpperCase() + candidate.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="primary-button review-start"
            type="button"
            disabled={!boardId || startSessionMutation.isPending}
            onClick={() => startSessionMutation.mutate({
              boardId,
              orderType,
              mode,
              timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            })}
          >
            Start review
          </button>
          {startSessionMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to start review right now.</p> : null}
        </section>
      ) : null}

      {session && session.words.length === 0 ? (
        <section className="review-summary" data-testid="review-summary">
          <CheckCircle2 size={38} />
          <span className="preview-label">All clear</span>
          <h1>{session.boardName}</h1>
          <p>No overdue or due-today words are waiting on this board right now.</p>
          <Link className="primary-button review-summary__done" to="/flashcards">Done</Link>
        </section>
      ) : null}

      {session && currentWord && !completed ? (
        <section className="review-session">
          <div className="review-progress">
            <div>
              <span className="preview-label">
                {currentWord.mode === 'meaningToWord' ? 'Meaning -> Word' : currentWord.mode} · {session.orderType}
              </span>
              <strong>{currentIndex + 1} / {words.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={words.length} />
          </div>

          <article className={revealed ? 'review-card review-card--revealed' : 'review-card'} data-testid="active-review-card">
            <div className="review-card__front">
              <span>{currentWord.wordClass}</span>
              <h1>{currentWord.mode === 'meaningToWord' ? currentWord.meaningVn : currentWord.word}</h1>
              <button className="icon-button" type="button" aria-label="Play pronunciation" onClick={() => activeBoard ? speakWord(currentWord.word, activeBoard.boardLanguage) : undefined}>
                <Volume2 size={18} />
              </button>
            </div>

            {!revealed ? (
              <button className="primary-button review-reveal" type="button" onClick={() => setRevealed(true)} data-testid="show-answer">
                Show answer
              </button>
            ) : (
              <div className="review-card__answer" data-testid="review-answer">
                <div><span>Word</span><strong>{currentWord.word}</strong></div>
                <div><span>Vietnamese</span><strong>{currentWord.meaningVn}</strong></div>
                <div><span>English meaning</span><p>{currentWord.meaningEn}</p></div>
                <div><span>Example</span><p>{currentWord.example}</p></div>
              </div>
            )}
          </article>

          {revealed ? (
            <div className="review-ratings" aria-label="Mark your answer">
              <button className="review-rating review-rating--good" type="button" disabled={submitReviewMutation.isPending} onClick={() => void answer(true)}>
                <CheckCircle2 size={16} /> I was correct
              </button>
              <button className="review-rating review-rating--again" type="button" disabled={submitReviewMutation.isPending} onClick={() => void answer(false)}>
                <XCircle size={16} /> I was wrong
              </button>
            </div>
          ) : null}

          {lastOutcome !== null && revealed ? (
            <button className="primary-button" type="button" onClick={resetForNextWord}>
              {currentIndex + 1 >= words.length ? 'Finish review' : 'Next word'}
            </button>
          ) : null}
          {submitReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this answer. Try again.</p> : null}
        </section>
      ) : null}

      {completed && session ? (
        <section className="review-summary" data-testid="review-summary">
          <CheckCircle2 size={38} />
          <span className="preview-label">Review complete</span>
          <h1>{session.boardName}</h1>
          <p>{correctCount} correct and {wrongCount} wrong across {session.totalWords} reviewed words.</p>
          <p>Session time: {completedElapsedSeconds} seconds.</p>
          <Link className="primary-button review-summary__done" to="/flashcards">Done</Link>
        </section>
      ) : null}
    </main>
  )
}
