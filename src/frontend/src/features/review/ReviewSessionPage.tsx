import { AudioLines, CheckCircle2, Languages, Mic, Play, Sparkles, Square, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as reviewApi from './api/review.api'
import { listBoards, type FlashcardBoard } from '@/features/flashcards'
import { assessPronunciation, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { SelectMenu } from '@/shared/components/ui/select-menu'

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

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function buildBoardOptions(boards: FlashcardBoard[]) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const today = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`

  const options = boards.map((board) => {
    const words = board.pages.flatMap((page) => page.words)
    const dueCount = words.filter((word) => word.isInReview && word.nextReviewDate && word.nextReviewDate <= today).length

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
  const [boardId, setBoardId] = useState('')
  const [orderType, setOrderType] = useState<reviewApi.ReviewOrderType>('sequential')
  const [reviewMode, setReviewMode] = useState<reviewApi.ReviewMode>('random')
  const [recapEnabled, setRecapEnabled] = useState(true)
  const [session, setSession] = useState<reviewApi.ReviewSessionCreated | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [pronunciationError, setPronunciationError] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [showRecap, setShowRecap] = useState(false)
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const sessionStartedAt = useRef(0)
  const cardStartedAt = useRef(0)
  const recordingRef = useRef<ActivePcmRecording | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: listBoards })
  const boards = useMemo(() => buildBoardOptions(decksQuery.data ?? []), [decksQuery.data])
  const activeBoard = boards.find((item) => item.boardId === boardId) ?? null
  const words = session?.words ?? []
  const currentWord = words[currentIndex] ?? null
  const currentLanguage = activeBoard?.boardLanguage ?? 'en'
  const recordingSupported = supportsPcmRecording()

  const startSessionMutation = useMutation({
    mutationFn: reviewApi.createReviewSession,
    onSuccess: openSession,
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
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)

    if (currentWord.mode !== 'meaningToWord' && activeBoard) {
      speakWord(currentWord.word, activeBoard.boardLanguage)
    }
  }, [activeBoard, currentLanguage, currentWord])

  useEffect(() => () => {
    void recordingRef.current?.cancel()
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
    }
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
        if (isAutoAdvancing) return
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
  }, [session, currentWord, completed, showRecap, typedAnswer, isRecording, isAutoAdvancing, recordingSupported, pronunciationMutation.isPending, pronunciationAttempts, currentLanguage])

  function openSession(nextSession: reviewApi.ReviewSessionCreated) {
    setSession(nextSession)
    setCurrentIndex(0)
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setPronunciationAttempts(0)
    setIsAutoAdvancing(false)
    setCompletedElapsedSeconds(0)
    setCompleted(false)
    sessionStartedAt.current = Date.now()
    cardStartedAt.current = Date.now()
  }
  function resetToLanding() {
    setSession(null)
    setBoardId('')
    setRecapEnabled(true)
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationError(null)
    setCorrectCount(0)
    setWrongCount(0)
    setShowRecap(false)
    setPronunciationAttempts(0)
    setIsAutoAdvancing(false)
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

  async function startReview() {
    if (!boardId) return

    await startSessionMutation.mutateAsync({
      boardId,
      orderType,
      mode: reviewMode,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }

  function schedulePostAnswerTransition() {
    setIsAutoAdvancing(true)
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null
      setFeedback(null)
      setIsAutoAdvancing(false)
      if (recapEnabled) {
        setShowRecap(true)
        return
      }

      moveToNextWord()
    }, 2000)
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

    setFeedback(correct ? 'correct' : 'wrong')
    schedulePostAnswerTransition()
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
    if (!currentWord || isAutoAdvancing) return
    const correct = normalizeAnswer(typedAnswer) === normalizeAnswer(currentWord.word)
    void submitOutcome(correct)
  }

  const noBoardSelected = !boardId
  const noDueWords = Boolean(activeBoard) && (activeBoard?.dueCount ?? 0) === 0
  const isMeaningToWord = currentWord?.mode === 'meaningToWord'
  const isPronunciation = currentWord?.mode === 'pronunciation'

  return (
    <>
      <div className={`flex h-full min-h-0 flex-col ${session ? 'overflow-y-auto' : 'overflow-hidden'}`} data-testid="review-page">
        {!session ? (
          <div className="review-setup-container">
            <div className="review-setup-card">
              <div className="review-setup-body">
                <div className="review-setup-field">
                  <label className="review-setup-label" htmlFor="board-select">Vocabulary board</label>
                  <SelectMenu
                    id="board-select"
                    className="review-setup-select-wrapper"
                    buttonClassName="review-setup-select"
                    value={boardId}
                    onChange={setBoardId}
                    aria-label="Vocabulary board"
                    options={[
                      { value: '', label: 'Select a board' },
                      ...boards.map((board) => ({
                        value: board.boardId,
                        label: `${board.boardName} (${board.dueCount} due)`,
                      })),
                    ]}
                  />
                  {noBoardSelected ? (
                    <p className="review-setup-state" data-testid="review-setup-state">Select a board to start review</p>
                  ) : noDueWords ? (
                    <p className="review-setup-state" data-testid="review-setup-state">No words due today</p>
                  ) : null}
                </div>

                <div className="review-setup-field">
                  <label className="review-setup-label">Review mode</label>
                  <div className="rs-selection-grid" role="group" aria-label="Review Mode">
                    <button
                      type="button"
                      className={`rs-selection-card ${reviewMode === 'random' ? 'active' : ''}`}
                      onClick={() => setReviewMode('random')}
                    >
                      <Sparkles className="rs-selection-card__icon" size={24} />
                      <div className="rs-selection-card__info">
                        <strong>All 3 Modes</strong>
                        <span>Random mix of Dictation, Meaning & Pronunciation</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`rs-selection-card ${reviewMode === 'meaningToWord' ? 'active' : ''}`}
                      onClick={() => setReviewMode('meaningToWord')}
                    >
                      <Languages className="rs-selection-card__icon" size={24} />
                      <div className="rs-selection-card__info">
                        <strong>Meaning → Word</strong>
                        <span>Recall word from definition</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`rs-selection-card ${reviewMode === 'dictation' ? 'active' : ''}`}
                      onClick={() => setReviewMode('dictation')}
                    >
                      <AudioLines className="rs-selection-card__icon" size={24} />
                      <div className="rs-selection-card__info">
                        <strong>Dictation</strong>
                        <span>Listen & type the spoken word</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`rs-selection-card ${reviewMode === 'pronunciation' ? 'active' : ''}`}
                      onClick={() => setReviewMode('pronunciation')}
                    >
                      <Mic className="rs-selection-card__icon" size={24} />
                      <div className="rs-selection-card__info">
                        <strong>Pronunciation</strong>
                        <span>Speak into mic for AI scoring</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="review-setup-field">
                  <label className="review-setup-label">Card order</label>
                  <div className="review-setup-options" role="group" aria-label="Review order">
                    <button
                      type="button"
                      className={`review-mode ${
                        orderType === 'sequential' ? 'review-mode--active' : ''
                      }`}
                      onClick={() => setOrderType('sequential')}
                    >
                      <span>Sequential</span>
                    </button>

                    <button
                      type="button"
                      className={`review-mode ${
                        orderType === 'shuffle' ? 'review-mode--active' : ''
                      }`}
                      onClick={() => setOrderType('shuffle')}
                    >
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>

                <label className="review-recap-toggle">
                  <input
                    type="checkbox"
                    checked={recapEnabled}
                    onChange={(event) => setRecapEnabled(event.target.checked)}
                  />
                  <span>Show recap after each answer</span>
                </label>

                <div className="review-setup-actions">
                  <button
                    className="review-setup-start-btn"
                    type="button"
                    disabled={!boardId || noDueWords || startSessionMutation.isPending}
                    onClick={() => void startReview()}
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
              </div>
              <progress value={currentIndex + 1} max={words.length} />
            </div>

            <article
              className={`review-card review-card--${currentWord.mode} ${feedback ? `review-card--feedback-${feedback}` : ''}`}
              data-testid="active-review-card"
            >
              {feedback ? (
                <div className={`review-feedback review-feedback--${feedback}`} role="status" aria-live="polite">
                  {feedback === 'correct' ? 'CORRECT' : 'WRONG'}
                </div>
              ) : showRecap ? (
                <div className="review-recap" data-testid="review-answer">
                  <header className="review-recap__header">
                    <h2>
                      {currentWord.word}
                      {hasText(currentWord.wordClass) ? <span> ({formatWordClass(currentWord.wordClass)})</span> : null}
                    </h2>
                    {hasText(currentWord.ipaPronunciation) ? <p>{formatIpa(currentWord.ipaPronunciation)}</p> : null}
                  </header>

                  {hasText(currentWord.meaningEn) || hasText(currentWord.meaningVn) || hasText(currentWord.example) || hasText(currentWord.thesaurus) || hasText(currentWord.collocation) ? (
                    <div className="review-recap__details review-recap__details--inline">
                      {hasText(currentWord.meaningEn) ? <p><strong><em>Definition:</em></strong> {currentWord.meaningEn}</p> : null}
                      {hasText(currentWord.meaningVn) ? <p><strong><em>Meaning:</em></strong> {currentWord.meaningVn}</p> : null}
                      {hasText(currentWord.example) ? <p><strong><em>Example:</em></strong> {currentWord.example}</p> : null}
                      {hasText(currentWord.thesaurus) ? <p><strong><em>Synonyms:</em></strong> {currentWord.thesaurus}</p> : null}
                      {hasText(currentWord.collocation) ? <p><strong><em>Antonyms:</em></strong> {currentWord.collocation}</p> : null}
                    </div>
                  ) : null}

                  <button className="primary-button review-recap__continue" type="button" onClick={moveToNextWord}>
                    {currentIndex + 1 >= words.length ? 'Finish review' : 'Continue'}
                  </button>
                </div>
              ) : (
                <div className="review-exercise">
                  <h2 className="review-exercise__prompt">
                    {currentWord.mode === 'dictation'
                      ? 'Listen carefully, then type the word you hear'
                      : isMeaningToWord
                        ? 'What word matches this meaning?'
                        : 'Say the word naturally'}
                  </h2>

                  {currentWord.mode === 'dictation' ? (
                    <div className="review-exercise__stage review-exercise__stage--dictation">
                      <button
                        className="review-audio-action"
                        type="button"
                        aria-label="Play pronunciation"
                        title="Play audio (Tab)"
                        onClick={() => speakWord(currentWord.word, currentLanguage)}
                      >
                        <Volume2 size={22} />
                        <span>Play audio</span>
                      </button>
                    </div>
                  ) : isMeaningToWord ? (
                    <div className="review-exercise__stage review-meaning-card">
                      {currentWord.meaningVn ? <strong>{currentWord.meaningVn}</strong> : null}
                      {currentWord.meaningEn ? <p>{currentWord.meaningEn}</p> : null}
                    </div>
                  ) : (
                    <div className="review-exercise__stage review-pronunciation-stage">
                      <div className="review-pronunciation-target">
                        <strong>{currentWord.word}</strong>
                        {hasText(currentWord.ipaPronunciation) ? <span>{formatIpa(currentWord.ipaPronunciation)}</span> : null}
                        <button type="button" aria-label="Play pronunciation" title="Play audio (Tab)" onClick={() => speakWord(currentWord.word, currentLanguage)}>
                          <Volume2 size={20} />
                        </button>
                      </div>

                      <div className="review-pronunciation-controls">
                        <button
                          className={`review-record-button ${isRecording ? 'review-record-button--active' : ''}`}
                          type="button"
                          aria-label="Start recording"
                          title="Record (R)"
                          onClick={() => void startRecording()}
                          disabled={isAutoAdvancing || isRecording || pronunciationMutation.isPending || pronunciationAttempts >= 2 || !recordingSupported}
                        >
                          <Mic size={22} />
                        </button>
                        <button
                          className="review-stop-button"
                          type="button"
                          aria-label="Stop recording"
                          title="Stop (Space)"
                          onClick={() => void recordingRef.current?.stop()}
                          disabled={!isRecording}
                        >
                          <Square size={18} fill="currentColor" />
                        </button>
                      </div>

                      <span className="review-pronunciation-attempt">Attempt {Math.min(pronunciationAttempts + 1, 2)} of 2</span>
                    </div>
                  )}

                  {!isPronunciation ? (
                    <div className="review-answer-form">
                      <label htmlFor="review-answer-input">
                        {isMeaningToWord ? 'Type the word' : 'Type the target word'}
                      </label>
                      <input
                        id="review-answer-input"
                        value={typedAnswer}
                        disabled={isAutoAdvancing || submitReviewMutation.isPending}
                        placeholder={isMeaningToWord ? 'Type the word...' : 'Type your answer...'}
                        onChange={(event) => setTypedAnswer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && normalizeAnswer(typedAnswer).length > 0) {
                            event.preventDefault()
                            event.stopPropagation()
                            checkTypedAnswer()
                          }
                        }}
                      />
                      <div className="review-exercise__actions">
                        <button className="primary-button review-submit-button" type="button" title="Submit answer (Enter)" onClick={checkTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0 || isAutoAdvancing || submitReviewMutation.isPending}>
                          Submit
                        </button>
                        <button className="review-skip-button" type="button" onClick={() => void submitOutcome(false)} disabled={isAutoAdvancing || submitReviewMutation.isPending}>
                          Skip
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="review-exercise__actions">
                      <button className="review-skip-button" type="button" onClick={() => void submitOutcome(false)} disabled={isAutoAdvancing || isRecording || pronunciationMutation.isPending || submitReviewMutation.isPending}>
                        Skip
                      </button>
                    </div>
                  )}

                  {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}
                </div>
              )}
            </article>

            {submitReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this answer. Try again.</p> : null}
          </section>
        ) : null}

        {completed && session ? (
          <section className="review-summary" data-testid="review-summary">
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

      </div>
    </>
  )
}
