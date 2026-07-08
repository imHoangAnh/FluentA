import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Columns3,
  Globe,
  HelpCircle,
  Kanban,
  Layers,
  LogOut,
  NotebookPen,
  Play,
  Repeat2,
  Settings,
  Timer,
  Volume2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'
import { LearningNavLinks } from '../../components/LearningNavLinks'

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function buildBoardOptions(boards: flashcardApi.FlashcardBoard[]) {
  const options = boards.map((board) => {
    const words = board.pages.flatMap((page) => page.words)
    const dueCount = words.filter((word) => word.isInReview && word.nextReviewDate).length

    return {
      boardId: board.boardId,
      boardName: board.boardName,
      boardLanguage: board.boardLanguage,
      dueCount,
      totalWords: words.length,
    }
  })

  return options.sort((left, right) => {
    if (right.dueCount !== left.dueCount) return right.dueCount - left.dueCount
    return right.boardName.localeCompare(left.boardName)
  })
}

export function ReviewSessionPage() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.email || 'FluentA')}`
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Learner'

  const [boardId, setBoardId] = useState('')
  const [orderType, setOrderType] = useState<flashcardApi.ReviewOrderType>('sequential')
  const [resumeModalSession, setResumeModalSession] = useState<flashcardApi.ReviewSessionCreated | null>(null)
  const [session, setSession] = useState<flashcardApi.ReviewSessionCreated | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [showRecap, setShowRecap] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<'correct' | 'wrong' | null>(null)
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const sessionStartedAt = useRef(0)
  const cardStartedAt = useRef(0)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: flashcardApi.listBoards })
  const reviewSettingsQuery = useQuery({ queryKey: ['review', 'settings'], queryFn: flashcardApi.getReviewSettings })
  const boards = useMemo(() => buildBoardOptions(decksQuery.data ?? []), [decksQuery.data])
  const activeBoard = boards.find((item) => item.boardId === boardId) ?? null
  const words = session?.words ?? []
  const currentWord = words[currentIndex] ?? null
  const recapAfterAnswer = reviewSettingsQuery.data?.recapAfterAnswer ?? true
  const currentLanguage = activeBoard?.boardLanguage ?? 'en'

  const startSessionMutation = useMutation({
    mutationFn: flashcardApi.createReviewSession,
    onSuccess: (result) => {
      if (result.startDisposition === 'prompt') {
        setResumeModalSession(result)
        return
      }

      openSession(result)
    },
  })

  const submitReviewMutation = useMutation({ mutationFn: flashcardApi.submitReview })

  useEffect(() => {
    if (!currentWord) return
    cardStartedAt.current = Date.now()
    setTypedAnswer('')
    setTranscript('')
    setFeedback(null)
    setRecognitionError(null)
    setPronunciationAttempts(0)
    setShowRecap(false)
    setLastOutcome(null)
    recognitionRef.current?.stop()
    setIsListening(false)

    if (currentWord.mode !== 'meaningToWord' && activeBoard) {
      speakWord(currentWord.word, activeBoard.boardLanguage)
    }
  }, [activeBoard, currentLanguage, currentWord])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  function openSession(nextSession: flashcardApi.ReviewSessionCreated) {
    setResumeModalSession(null)
    setSession(nextSession)
    setCurrentIndex(0)
    setTypedAnswer('')
    setTranscript('')
    setFeedback(null)
    setRecognitionError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setLastOutcome(null)
    setPronunciationAttempts(0)
    setCompletedElapsedSeconds(0)
    sessionStartedAt.current = Date.now()
    cardStartedAt.current = Date.now()
  }

  function resetToLanding() {
    setSession(null)
    setResumeModalSession(null)
    setBoardId('')
    setTypedAnswer('')
    setTranscript('')
    setFeedback(null)
    setRecognitionError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setLastOutcome(null)
    setPronunciationAttempts(0)
    setCompletedElapsedSeconds(0)
  }

  function normalizeAnswer(value: string) {
    return value.trim().toLowerCase()
  }

  function recognitionConstructor() {
    const browserWindow = window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition
    }

    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
  }

  function startListening() {
    const Constructor = recognitionConstructor()
    if (!Constructor) {
      setRecognitionError('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new Constructor()
    recognition.lang = getLanguageProfile(currentLanguage).speechLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const value = event.results[0]?.[0]?.transcript?.trim() ?? ''
      setTranscript(value)
      setRecognitionError(null)
    }
    recognition.onerror = (event: { error?: string }) => {
      setRecognitionError(event.error ? `Speech recognition error: ${event.error}.` : 'Speech recognition could not capture your speech.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    setTranscript('')
    setIsListening(true)
    recognition.start()
  }

  async function startReview(startBehavior: flashcardApi.ReviewStartBehavior) {
    if (!boardId) return

    await startSessionMutation.mutateAsync({
      boardId,
      orderType,
      mode: 'random',
      startBehavior,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }

  async function submitOutcome(correct: boolean) {
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

    const isFinalWord = currentIndex + 1 >= words.length
    if (isFinalWord) {
      setCompletedElapsedSeconds(Math.max(0, Math.round((Date.now() - sessionStartedAt.current) / 1000)))
      setLastOutcome(correct ? 'correct' : 'wrong')
      setShowRecap(recapAfterAnswer)
      return
    }

    if (!recapAfterAnswer) {
      moveToNextWord()
      return
    }

    setLastOutcome(correct ? 'correct' : 'wrong')
    setShowRecap(true)
  }

  function moveToNextWord() {
    setCurrentIndex((value) => value + 1)
  }

  function checkTypedAnswer() {
    if (!currentWord) return
    const correct = normalizeAnswer(typedAnswer) === normalizeAnswer(currentWord.word)
    void submitOutcome(correct)
  }

  function checkTranscriptAnswer() {
    if (!currentWord) return
    const attempts = pronunciationAttempts + 1
    setPronunciationAttempts(attempts)
    const correct = normalizeAnswer(transcript) === normalizeAnswer(currentWord.word)
    if (correct) {
      void submitOutcome(true)
      return
    }

    if (attempts >= 2) {
      void submitOutcome(false)
      return
    }

    setFeedback('Transcript did not match the target word. You can try once more.')
  }

  const completed = Boolean(session) && currentIndex + 1 >= words.length && (lastOutcome !== null || !currentWord)
  const noBoardSelected = !boardId
  const noDueWords = Boolean(activeBoard) && (activeBoard?.dueCount ?? 0) === 0 && !resumeModalSession?.startOptions.hasActiveSameDaySession

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Globe size={24} />
          </div>
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
          <Link to="/countdowns" className={location.pathname === '/countdowns' ? 'active' : ''}>
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
            <Link to="#" onClick={(event) => { event.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column' }}>
        {!session ? (
          <div className="review-setup-container">
            <div className="review-setup-card">
              <div className="review-setup-header">
                <span className="review-setup-badge">Board Review</span>
                <h1>Review due words</h1>
                <p>Pick a board, choose queue order, then FluentA will start a random-mode review queue from the board&apos;s due words.</p>
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
                          {board.boardName} ({board.dueCount} due)
                        </option>
                      ))}
                    </select>
                    <span className="review-setup-select-chevron">
                      <ChevronDown size={20} />
                    </span>
                  </div>
                </div>

                <div className="review-setup-options" role="group" aria-label="Review order">
                  <button
                    className={orderType === 'sequential' ? 'review-mode review-mode--active' : 'review-mode'}
                    type="button"
                    onClick={() => setOrderType('sequential')}
                  >
                    Sequential
                    <small>Lower level first, then older words.</small>
                  </button>
                  <button
                    className={orderType === 'shuffle' ? 'review-mode review-mode--active' : 'review-mode'}
                    type="button"
                    onClick={() => setOrderType('shuffle')}
                  >
                    Shuffle
                    <small>Shuffle after due-word queue selection.</small>
                  </button>
                </div>

                {noBoardSelected ? (
                  <div className="empty-panel flashcard-empty">
                    <Layers size={28} />
                    <h2>Select a board to start review</h2>
                    <p>Review stays board-scoped and starts only after you choose the board you want to study.</p>
                  </div>
                ) : null}

                {noDueWords ? (
                  <div className="empty-panel flashcard-empty">
                    <CheckCircle2 size={28} />
                    <h2>No words due today</h2>
                    <p>This board has no due words right now, so Review can stay parked here until something becomes due again.</p>
                  </div>
                ) : null}

                <div className="review-setup-actions">
                  <button
                    className="review-setup-start-btn"
                    type="button"
                    disabled={!boardId || noDueWords || startSessionMutation.isPending}
                    onClick={() => void startReview('prompt')}
                  >
                    <Play size={20} fill="currentColor" />
                    Start review
                  </button>
                  <p className="review-setup-note">
                    Random mode is fixed for Review. Progress keeps the queue membership owned by the review session.
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
            <p>No words are available in the remaining queue for this session.</p>
            <button className="primary-button review-summary__done" type="button" onClick={resetToLanding}>Finish</button>
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

            <article className="review-card" data-testid="active-review-card">
              <div className="review-card__front">
                <span>{currentWord.wordClass}</span>
                <h1>{currentWord.mode === 'meaningToWord' ? currentWord.meaningVn : currentWord.word}</h1>
                <button className="icon-button" type="button" aria-label="Play pronunciation" onClick={() => speakWord(currentWord.word, currentLanguage)}>
                  <Volume2 size={18} />
                </button>
              </div>

              {!showRecap ? (
                <div className="practice-answer-panel">
                  {currentWord.mode === 'pronunciation' ? (
                    <>
                      <label className="practice-label" htmlFor="review-transcript">Transcript</label>
                      <textarea
                        id="review-transcript"
                        className="practice-input practice-input--multiline"
                        value={transcript}
                        onChange={(event) => setTranscript(event.target.value)}
                      />
                      <div className="deck-actions">
                        <button className="secondary-button" type="button" onClick={startListening} disabled={isListening}>
                          Start listening
                        </button>
                        <button className="secondary-button" type="button" onClick={() => recognitionRef.current?.stop()} disabled={!isListening}>
                          Stop
                        </button>
                        <button className="primary-button" type="button" onClick={checkTranscriptAnswer} disabled={normalizeAnswer(transcript).length === 0}>
                          Check transcript
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="practice-label" htmlFor="review-answer-input">Type the target word</label>
                      <input
                        id="review-answer-input"
                        className="practice-input"
                        value={typedAnswer}
                        onChange={(event) => setTypedAnswer(event.target.value)}
                      />
                      <button className="primary-button" type="button" onClick={checkTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0}>
                        Submit answer
                      </button>
                    </>
                  )}

                  {recognitionError ? <p className="flashcard-status flashcard-status--error">{recognitionError}</p> : null}
                  {feedback ? <p className="practice-feedback">{feedback}</p> : null}
                </div>
              ) : (
                <div className="review-card__answer" data-testid="review-answer">
                  <div><span>Word</span><strong>{currentWord.word}</strong></div>
                  <div><span>Vietnamese</span><strong>{currentWord.meaningVn}</strong></div>
                  <div><span>English meaning</span><p>{currentWord.meaningEn}</p></div>
                  <div><span>Example</span><p>{currentWord.example}</p></div>
                  <button className="primary-button" type="button" onClick={moveToNextWord}>
                    {currentIndex + 1 >= words.length ? 'Finish review' : 'Next'}
                  </button>
                </div>
              )}
            </article>

            {submitReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this answer. Try again.</p> : null}
          </section>
        ) : null}

        {completed && session ? (
          <section className="review-summary" data-testid="review-summary">
            <CheckCircle2 size={38} />
            <span className="preview-label">Review complete</span>
            <h1>{session.boardName}</h1>
            <p>{correctCount} correct and {wrongCount} wrong across {correctCount + wrongCount} reviewed words.</p>
            <p>Session time: {completedElapsedSeconds} seconds.</p>
            <button className="primary-button review-summary__done" type="button" onClick={resetToLanding}>Done</button>
          </section>
        ) : null}

        {resumeModalSession ? (
          <div className="habit-modal-overlay" role="presentation">
            <div className="habit-modal" role="dialog" aria-modal="true" aria-label="Resume review session">
              <div className="habit-modal-header">
                <div>
                  <span className="preview-label">Resume review</span>
                  <h3>{resumeModalSession.boardName}</h3>
                </div>
                <button type="button" onClick={() => setResumeModalSession(null)} aria-label="Close resume modal">
                  <X size={18} />
                </button>
              </div>
              <p>{resumeModalSession.startOptions.remainingWords} words are still waiting in today&apos;s unfinished review session.</p>
              <div className="deck-actions">
                <button className="primary-button" type="button" onClick={() => void startReview('continue')}>
                  Continue Review
                </button>
                <button className="secondary-button" type="button" onClick={() => void startReview('replace')}>
                  Start New Session
                </button>
                <button className="ghost-button ghost-button--inline" type="button" onClick={() => setResumeModalSession(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
