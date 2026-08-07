import { CheckCircle2, ChevronDown, Layers, Mic, MicOff, Play, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as reviewApi from './api/review.api'
import { listBoards, type FlashcardBoard } from '@/features/flashcards'
import { getReviewSettings } from './api/review-settings.api'
import { assessPronunciation, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function formatIpa(value: string) {
  const cleaned = value.trim().replace(/^\/+|\/+$/g, '')
  return `/${cleaned}/`
}

function formatWordClass(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

function buildBoardOptions(boards: FlashcardBoard[]) {
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

function modeLabel(mode: reviewApi.ReviewSessionWord['mode']) {
  return mode === 'meaningToWord' ? 'Meaning -> Word' : mode
}

export function ReviewSessionPage() {

  const [boardId, setBoardId] = useState('')
  const [orderType, setOrderType] = useState<reviewApi.ReviewOrderType>('sequential')
  const [resumeModalSession, setResumeModalSession] = useState<reviewApi.ReviewSessionCreated | null>(null)
  const [session, setSession] = useState<reviewApi.ReviewSessionCreated | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [pronunciationError, setPronunciationError] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [showRecap, setShowRecap] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<'correct' | 'wrong' | null>(null)
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [completed, setCompleted] = useState(false)
  const sessionStartedAt = useRef(0)
  const cardStartedAt = useRef(0)
  const recordingRef = useRef<ActivePcmRecording | null>(null)

  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: listBoards })
  const reviewSettingsQuery = useQuery({ queryKey: ['review', 'settings'], queryFn: getReviewSettings })
  const boards = useMemo(() => buildBoardOptions(decksQuery.data ?? []), [decksQuery.data])
  const activeBoard = boards.find((item) => item.boardId === boardId) ?? null
  const words = session?.words ?? []
  const currentWord = words[currentIndex] ?? null
  const recapAfterAnswer = reviewSettingsQuery.data?.recapAfterAnswer ?? true
  const currentLanguage = activeBoard?.boardLanguage ?? 'en'
  const recordingSupported = supportsPcmRecording()

  const startSessionMutation = useMutation({
    mutationFn: reviewApi.createReviewSession,
    onSuccess: (result) => {
      if (result.startDisposition === 'prompt') {
        setResumeModalSession(result)
        return
      }

      openSession(result)
    },
  })

  const submitReviewMutation = useMutation({ mutationFn: reviewApi.submitReview })
  const pronunciationMutation = useMutation({ mutationFn: ({ wordId, audio }: { wordId: string; audio: Blob }) => assessPronunciation(wordId, audio) })

  useEffect(() => {
    if (!currentWord) return
    cardStartedAt.current = Date.now()
    // A newly active word must not display the prior word's answer or pronunciation state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationError(null)
    setPronunciationAttempts(0)
    setShowRecap(false)
    setLastOutcome(null)
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)

    if (currentWord.mode !== 'meaningToWord' && activeBoard) {
      speakWord(currentWord.word, activeBoard.boardLanguage)
    }
  }, [activeBoard, currentLanguage, currentWord])

  useEffect(() => () => {
    void recordingRef.current?.cancel()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    if (!session || !currentWord || completed) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        event.preventDefault()
        speakWord(currentWord.word, currentLanguage)
        return
      }

      if (event.key === 'Enter') {
        if (showRecap) {
          event.preventDefault()
          moveToNextWord()
          return
        }
        if (currentWord.mode !== 'pronunciation') {
          if (normalizeAnswer(typedAnswer).length > 0) {
            event.preventDefault()
            checkTypedAnswer()
          }
        }
        return
      }

      if ((event.key === 'r' || event.key === 'R') && currentWord.mode === 'pronunciation') {
        const target = event.target as HTMLElement | null
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
        if (!isInput && !isRecording && recordingSupported && !pronunciationMutation.isPending && pronunciationAttempts < 2) {
          event.preventDefault()
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && currentWord.mode === 'pronunciation') {
        if (isRecording) {
          event.preventDefault()
          void recordingRef.current?.stop()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, currentWord, completed, showRecap, typedAnswer, isRecording, recordingSupported, pronunciationMutation.isPending, pronunciationAttempts, currentLanguage])

  function openSession(nextSession: reviewApi.ReviewSessionCreated) {
    setResumeModalSession(null)
    setSession(nextSession)
    setCurrentIndex(0)
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setLastOutcome(null)
    setPronunciationAttempts(0)
    setCompletedElapsedSeconds(0)
    setCompleted(false)
    sessionStartedAt.current = Date.now()
    cardStartedAt.current = Date.now()
  }

  function resetToLanding() {
    setSession(null)
    setResumeModalSession(null)
    setBoardId('')
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setLastOutcome(null)
    setPronunciationAttempts(0)
    setCompletedElapsedSeconds(0)
    setCompleted(false)
  }

  function normalizeAnswer(value: string) {
    return value.trim().toLowerCase()
  }

  async function handlePronunciationAudio(audio: Blob) {
    recordingRef.current = null
    setIsRecording(false)
    if (!currentWord) return

    try {
      const result = await pronunciationMutation.mutateAsync({ wordId: currentWord.wordId, audio })
      const attempts = pronunciationAttempts + 1
      setPronunciationAttempts(attempts)
      setFeedback(result.correct ? 'correct' : 'wrong')
      if (result.correct) {
        await submitOutcome(true)
      } else if (attempts >= 2) {
        await submitOutcome(false)
      }
    } catch {
      setPronunciationError('Pronunciation assessment is unavailable. Try recording again; this did not use an attempt.')
    }
  }

  async function startRecording() {
    setPronunciationError(null)
    pronunciationMutation.reset()
    try {
      recordingRef.current = await startPcmRecording(handlePronunciationAudio)
      setIsRecording(true)
    } catch {
      setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    }
  }

  async function startReview(startBehavior: reviewApi.ReviewStartBehavior) {
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

    setLastOutcome(correct ? 'correct' : 'wrong')
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct && !recapAfterAnswer) {
      moveToNextWord()
      return
    }

    setShowRecap(true)
  }

  function moveToNextWord() {
    if (currentIndex + 1 >= words.length) {
      setCompletedElapsedSeconds(Math.max(0, Math.round((Date.now() - sessionStartedAt.current) / 1000)))
      setCompleted(true)
      return
    }

    setCurrentIndex((value) => value + 1)
  }

  function checkTypedAnswer() {
    if (!currentWord) return
    const correct = normalizeAnswer(typedAnswer) === normalizeAnswer(currentWord.word)
    void submitOutcome(correct)
  }

  const noBoardSelected = !boardId
  const noDueWords = Boolean(activeBoard) && (activeBoard?.dueCount ?? 0) === 0 && !resumeModalSession?.startOptions.hasActiveSameDaySession
  const isMeaningToWord = currentWord?.mode === 'meaningToWord'
  const isPronunciation = currentWord?.mode === 'pronunciation'

  return (
    <>
      <div className="flex flex-col">
        {!session ? (
          <div className="review-setup-container">
            <div className="review-setup-card">
              <div className="review-setup-header">
                <span className="review-setup-badge">Review</span>
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
                    type="button"
                    className={`review-mode ${
                      orderType === "sequential" ? "review-mode--active" : ""
                    }`}
                    onClick={() => setOrderType("sequential")}
                  >
                    <span>Sequential</span>
                  </button>

                  <button
                    type="button"
                    className={`review-mode ${
                      orderType === "shuffle" ? "review-mode--active" : ""
                    }`}
                    onClick={() => setOrderType("shuffle")}
                  >
                    <span>Shuffle</span>
                  </button>
                </div>

                {noBoardSelected ? (
                  <div className="empty-panel flashcard-empty">
                    <Layers size={28} />
                    <h2>Select a board to start review</h2>
                  </div>
                ) : null}

                {noDueWords ? (
                  <div className="empty-panel flashcard-empty">
                    <CheckCircle2 size={28} />
                    <h2>No words due today</h2>
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
              <div className="review-progress-header">
                <span className="review-progress-order">{session.orderType === 'shuffle' ? 'Shuffle' : 'Sequential'}</span>
                <strong className="review-progress-count">{currentIndex + 1} / {words.length}</strong>
                <span className="review-progress-spacer" aria-hidden="true" />
              </div>
              <progress value={currentIndex + 1} max={words.length} />
            </div>

            <article className={`review-card review-card--soft review-card--${currentWord.mode}`} data-testid="active-review-card">
              {currentWord.mode === 'dictation' ? (
                <div className="practice-dictation-hero">
                  <h2>Listen, then type the spoken word</h2>
                  <div className="practice-audio-trigger-hub">
                    <button
                      className="practice-audio-hero-button"
                      type="button"
                      aria-label="Play pronunciation"
                      title="Play audio (Tab)"
                      onClick={() => speakWord(currentWord.word, currentLanguage)}
                    >
                      <Volume2 size={28} />
                    </button>
                    <div className="practice-soundwave" aria-hidden="true">
                      <span /><span /><span /><span /><span />
                    </div>
                  </div>
                </div>
              ) : isMeaningToWord ? (
                <div className="practice-meaning-hero">
                  <div className="practice-meaning-box">
                    {currentWord.meaningVn ? (
                      <h2 className="practice-meaning-vn">{currentWord.meaningVn}</h2>
                    ) : null}
                    {currentWord.meaningEn ? (
                      <p className="practice-meaning-en">{currentWord.meaningEn}</p>
                    ) : null}
                  </div>
                </div>
              ) : isPronunciation ? (
                <div className="practice-pronunciation-hero">
                  <h2>Listen to target word, then record your voice</h2>
                  <div className="practice-attempt-trackers">
                    <span className={`practice-attempt-dot ${pronunciationAttempts >= 0 ? 'practice-attempt-dot--active' : ''}`} />
                    <span className={`practice-attempt-dot ${pronunciationAttempts >= 1 ? 'practice-attempt-dot--active' : ''}`} />
                    <span className="practice-attempt-copy">Attempt {pronunciationAttempts + 1} of 2</span>
                  </div>
                  <div className="practice-pronunciation-controls">
                    <button className="icon-button practice-audio-button" type="button" aria-label="Play pronunciation" title="Play audio (Tab)" onClick={() => speakWord(currentWord.word, currentLanguage)}>
                      <Volume2 size={20} />
                    </button>
                    <button className={`secondary-button ${isRecording ? 'practice-mic-studio-btn--recording' : ''}`} type="button" title="Record (R)" onClick={() => void startRecording()} disabled={isRecording || pronunciationMutation.isPending || pronunciationAttempts >= 2 || !recordingSupported}>
                      <Mic size={16} /> Record
                    </button>
                    <button className="secondary-button" type="button" title="Stop (Space)" onClick={() => void recordingRef.current?.stop()} disabled={!isRecording}>
                      <MicOff size={16} /> Stop
                    </button>
                  </div>
                </div>
              ) : (
                <div className="review-card__front">
                  <span>{modeLabel(currentWord.mode)}</span>
                  <h1>{currentWord.word}</h1>
                  <p>{currentWord.wordClass}</p>
                  <button className="icon-button" type="button" aria-label="Play pronunciation" title="Play audio (Tab)" onClick={() => speakWord(currentWord.word, currentLanguage)}>
                    <Volume2 size={18} />
                  </button>
                </div>
              )}

              {!showRecap ? (
                <div className="practice-answer-panel">
                  {!isPronunciation ? (
                    <div className="practice-input-group">
                      <label className="practice-label" htmlFor="review-answer-input">
                        {isMeaningToWord ? 'Type the word for this meaning' : 'Type what you hear'}
                      </label>
                      <input
                        id="review-answer-input"
                        className="practice-input"
                        value={typedAnswer}
                        placeholder={isMeaningToWord ? 'Enter the target word' : 'Enter the spoken word'}
                        onChange={(event) => setTypedAnswer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && normalizeAnswer(typedAnswer).length > 0) {
                            event.preventDefault()
                            checkTypedAnswer()
                          }
                        }}
                      />
                      <div className="practice-actions-stacked">
                        <button className="primary-button practice-btn-submit" type="button" title="Submit answer (Enter)" onClick={checkTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0}>
                          Submit answer
                        </button>
                        <button className="secondary-button practice-btn-skip" type="button" onClick={() => void submitOutcome(false)}>
                          Reveal / skip
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {feedback === 'wrong' ? (
                    <div className="answer-feedback-banner answer-feedback-banner--wrong" role="status">
                      ✕ Wrong
                    </div>
                  ) : null}
                  {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}
                </div>
              ) : (
                <div className="learning-recap" data-testid="review-answer">
                  {lastOutcome ? (
                    <div className={`answer-feedback-banner answer-feedback-banner--${lastOutcome}`} role="status">
                      {lastOutcome === 'correct' ? '✓ Correct' : '✕ Wrong'}
                    </div>
                  ) : null}
                  <div className="learning-recap__word">
                    <h2>{currentWord.word} <span>({formatWordClass(currentWord.wordClass)})</span></h2>
                    <button className="icon-button" type="button" aria-label="Play pronunciation" onClick={() => speakWord(currentWord.word, currentLanguage)}><Volume2 size={18} /></button>
                  </div>
                  <p className="learning-recap__ipa">{formatIpa(currentWord.ipaPronunciation)}</p>
                  <div className="learning-recap-details-card">
                    {currentWord.meaningEn ? (
                      <div className="learning-recap-detail-item">
                        <span className="learning-recap-detail-label">Definition</span>
                        <span className="learning-recap-detail-value">{currentWord.meaningEn}</span>
                      </div>
                    ) : null}
                    {currentWord.meaningVn ? (
                      <div className="learning-recap-detail-item">
                        <span className="learning-recap-detail-label">Meaning (VN)</span>
                        <span className="learning-recap-detail-value">{currentWord.meaningVn}</span>
                      </div>
                    ) : null}
                    {currentWord.example ? (
                      <div className="learning-recap-example-quote">
                        <span className="learning-recap-detail-label">Example</span>
                        <p className="m-0">{currentWord.example}</p>
                      </div>
                    ) : null}
                  </div>
                  <button className="primary-button practice-btn-submit" type="button" onClick={moveToNextWord}>
                    {currentIndex + 1 >= words.length ? 'Finish review' : 'Continue'}
                  </button>
                </div>
              )}
            </article>

            {submitReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this answer. Try again.</p> : null}
          </section>
        ) : null}

        {completed && session ? (
          <section className="review-summary" data-testid="review-summary">
            <div className="practice-summary-badge-icon">
              <CheckCircle2 size={40} />
            </div>
            <span className="preview-label">Review complete</span>
            <h1>{session.boardName}</h1>
            <p>{correctCount} correct and {wrongCount} wrong across {correctCount + wrongCount} reviewed words.</p>
            <div className="practice-summary-stats-grid">
              <div className="practice-stat-card practice-stat-card--correct">
                <span className="practice-stat-value">{correctCount}</span>
                <span className="practice-stat-label">Correct</span>
              </div>
              <div className="practice-stat-card practice-stat-card--wrong">
                <span className="practice-stat-value">{wrongCount}</span>
                <span className="practice-stat-label">Wrong</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Session time: {completedElapsedSeconds} seconds.</p>
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
    </>
  )
}
