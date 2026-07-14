import { CheckCircle2, ChevronDown, Layers, Play, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getReviewSettings } from '@/features/review'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Button } from '@/shared/components/ui/button'

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

function modeLabel(mode: flashcardApi.ReviewSessionWord['mode']) {
  return mode === 'meaningToWord' ? 'Meaning -> Word' : mode
}

export function ReviewSessionPage() {

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
  const reviewSettingsQuery = useQuery({ queryKey: ['review', 'settings'], queryFn: getReviewSettings })
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
    // A newly active word must not display the prior word's answer or transcript.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const isMeaningToWord = currentWord?.mode === 'meaningToWord'
  const isPronunciation = currentWord?.mode === 'pronunciation'

  return (
    <AppShell title="Review" description="Practice your due words and keep your learning streak moving." headerActions={<Button asChild variant="outline" size="sm"><Link to="/flashcards">Flashcards</Link></Button>}>
      <div className="flex flex-col">
        {!session ? (
          <div className="review-setup-container">
            <div className="review-setup-card">
              <div className="review-setup-header">
                <span className="review-setup-badge">Review</span>
                <h2>Select a board to start review</h2>
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
                  {modeLabel(currentWord.mode)} · {session.orderType}
                </span>
                <strong>{currentIndex + 1} / {words.length}</strong>
              </div>
              <progress value={currentIndex + 1} max={words.length} />
            </div>

            <article className="review-card" data-testid="active-review-card">
              <div className="review-card__front">
                <span>{modeLabel(currentWord.mode)}</span>
                {isMeaningToWord ? (
                  <>
                    <h1>{currentWord.meaningVn || currentWord.meaningEn}</h1>
                    {currentWord.meaningVn && currentWord.meaningEn ? <p>{currentWord.meaningEn}</p> : null}
                  </>
                ) : (
                  <>
                    <h1>{currentWord.mode === 'dictation' ? 'Listen, then type the word' : currentWord.word}</h1>
                    <p>{currentWord.wordClass}</p>
                    <button className="icon-button" type="button" aria-label="Play pronunciation" onClick={() => speakWord(currentWord.word, currentLanguage)}>
                      <Volume2 size={18} />
                    </button>
                  </>
                )}
              </div>

              {!showRecap ? (
                <div className="practice-answer-panel">
                  {isPronunciation ? (
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
                      <label className="practice-label" htmlFor="review-answer-input">
                        {isMeaningToWord ? 'Type the word for this meaning' : 'Type what you hear'}
                      </label>
                      <input
                        id="review-answer-input"
                        className="practice-input"
                        value={typedAnswer}
                        placeholder={isMeaningToWord ? 'Enter the target word' : 'Enter the spoken word'}
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
      </div>
    </AppShell>
  )
}
