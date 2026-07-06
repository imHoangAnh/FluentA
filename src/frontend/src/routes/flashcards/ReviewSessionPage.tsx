import {
  AlignLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Columns3,
  Dices,
  Globe,
  Info,
  Kanban,
  Keyboard,
  List,
  LogOut,
  NotebookPen,
  Play,
  Repeat2,
  Settings,
  HelpCircle,
  Shuffle,
  Timer,
  Volume2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'
import { LearningNavLinks } from '../../components/LearningNavLinks'

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
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.email || 'FluentA')}`
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Learner'

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
  const reviewSettingsQuery = useQuery({ queryKey: ['review', 'settings'], queryFn: flashcardApi.getReviewSettings })
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
      wordId: currentWord.wordId,
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
    <div className="dashboard-layout">
      {/* ── Dashboard Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">F</div>
          <div className="dashboard-brand-text">
            <h1>FluentA</h1>
            <p>Language Learning</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Columns3 size={20} /> Today
          </Link>
          <Link to="/vocabulary" className={location.pathname === '/vocabulary' ? 'active' : ''}>
            <BookOpen size={20} /> Vocabulary
          </Link>
          <LearningNavLinks />
          <Link to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            <CheckSquare size={20} /> Todo
          </Link>
          <Link to="/habits" className={location.pathname === '/habits' ? 'active' : ''}>
            <Repeat2 size={20} /> Habits
          </Link>
          <Link to="/countdown" className={location.pathname === '/countdown' ? 'active' : ''}>
            <CalendarClock size={20} /> Countdowns
          </Link>
          <Link to="/journal" className={location.pathname === '/journal' ? 'active' : ''}>
            <NotebookPen size={20} /> Journal
          </Link>
          <Link to="/kanban" className={location.pathname === '/kanban' ? 'active' : ''}>
            <Kanban size={20} /> Kanban
          </Link>
          <Link to="/pomodoro" className={location.pathname === '/pomodoro' ? 'active' : ''}>
            <Timer size={20} /> Pomodoro
          </Link>
        </nav>

        <div className="dashboard-user-section">
          <div className="dashboard-user-card">
            <img className="dashboard-user-avatar" src={avatarUrl} alt="User" />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{displayName}</p>
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column' }}>
        {!session ? (
          <div className="review-setup-container">
            <div className="review-setup-card">
              <div className="review-setup-header">
                <span className="review-setup-badge">Board Review</span>
                <h1>Review due words by board</h1>
                <p>Select one board, choose queue order and review mode, then FluentA will load only overdue and due-today words.</p>
              </div>
              <div className="review-setup-body">
                <div className="review-setup-field">
                  <label className="review-setup-label" htmlFor="board-select">Vocabulary board</label>
                  <div className="review-setup-select-wrapper">
                    <select
                      id="board-select"
                      className="review-setup-select"
                      value={boardId}
                      onChange={(event) => setBoardId(event.target.value)}
                      aria-label="Vocabulary board"
                    >
                      <option value="">Select a board</option>
                      {boards.map((board) => (
                        <option key={board.boardId} value={board.boardId}>
                          {board.boardName} ({board.wordCount} words)
                        </option>
                      ))}
                    </select>
                    <span className="review-setup-select-chevron">
                      <ChevronDown size={20} />
                    </span>
                  </div>
                </div>

                <div className="review-setup-grid">
                  <section className="review-setup-field">
                    <h3 className="review-setup-label">
                      <AlignLeft size={20} style={{ color: 'var(--teal)' }} />
                      Review Order
                    </h3>
                    <div className="review-setup-options" role="group" aria-label="Review order">
                      <button
                        className={`rs-selection-card${orderType === 'sequential' ? ' active' : ''}`}
                        type="button"
                        onClick={() => setOrderType('sequential')}
                      >
                        <span className="rs-selection-card__icon">
                          <List size={22} />
                        </span>
                        <div>
                          <p className="rs-selection-card__title">Sequential</p>
                          <p className="rs-selection-card__desc">Oldest due words first.</p>
                        </div>
                      </button>
                      <button
                        className={`rs-selection-card${orderType === 'shuffle' ? ' active' : ''}`}
                        type="button"
                        onClick={() => setOrderType('shuffle')}
                      >
                        <span className="rs-selection-card__icon">
                          <Shuffle size={22} />
                        </span>
                        <div>
                          <p className="rs-selection-card__title">Shuffle</p>
                          <p className="rs-selection-card__desc">Shuffle within the oldest-due limited set.</p>
                        </div>
                      </button>
                    </div>
                  </section>

                  <section className="review-setup-field">
                    <h3 className="review-setup-label">
                      <Keyboard size={20} style={{ color: 'var(--teal)' }} />
                      Review Mode
                    </h3>
                    <div className="review-setup-options" role="group" aria-label="Review mode">
                      {(['dictation', 'meaningToWord', 'pronunciation', 'random'] as flashcardApi.ReviewMode[]).map((candidate) => {
                        const title = candidate === 'meaningToWord' ? 'Meaning -> Word' : candidate[0].toUpperCase() + candidate.slice(1)
                        const Icon = candidate === 'dictation' ? Keyboard : candidate === 'meaningToWord' ? Globe : candidate === 'pronunciation' ? Volume2 : Dices
                        return (
                          <button
                            key={candidate}
                            className={`rs-selection-card rs-selection-card--center${mode === candidate ? ' active' : ''}`}
                            type="button"
                            onClick={() => setMode(candidate)}
                          >
                            <span className="rs-selection-card__icon">
                              <Icon size={20} />
                            </span>
                            <span className="rs-selection-card__title">{title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <div className="review-setup-actions">
                  <button
                    className="review-setup-start-btn"
                    type="button"
                    disabled={!boardId || startSessionMutation.isPending}
                    onClick={() => startSessionMutation.mutate({
                      boardId,
                      orderType,
                      mode,
                      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                    })}
                  >
                    <Play size={20} fill="currentColor" />
                    Start review
                  </button>
                  <p className="review-setup-note">
                    <Info size={15} /> Progress will be saved automatically as you go.
                  </p>
                  {startSessionMutation.isError ? (
                    <p className="flashcard-status flashcard-status--error">Unable to start review right now.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
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
    </div>
  )
}
