import { CheckCircle2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as reviewApi from './api/review.api'
import { listBoards, type FlashcardBoard } from '@/features/flashcards'
import { assessPronunciation, getPronunciationAssessmentErrorMessage, ShortcutGuide, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { ReviewCompletion } from './components/session/ReviewCompletion'
import { ReviewModeSurface } from './components/session/ReviewModeSurface'
import { ReviewProgress } from './components/session/ReviewProgress'
import { ReviewRecap } from './components/session/ReviewRecap'
import { ReviewSetup, type ReviewBoardOption } from './components/session/ReviewSetup'

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function buildBoardOptions(boards: FlashcardBoard[]): ReviewBoardOption[] {
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
  const [pronunciationFailed, setPronunciationFailed] = useState(false)
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
  const usesLargeAnswerLayout = currentWord?.mode === 'dictation' || currentWord?.mode === 'meaningToWord'
  const usesLargeSessionLayout = usesLargeAnswerLayout || currentWord?.mode === 'pronunciation'
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
    setPronunciationFailed(false)
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

  function openSession(nextSession: reviewApi.ReviewSessionCreated) {
    setSession(nextSession)
    setCurrentIndex(0)
    setTypedAnswer('')
    setFeedback(null)
    setPronunciationFailed(false)
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
    setPronunciationFailed(false)
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

  const moveToNextWord = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      setCompletedElapsedSeconds(Math.max(0, Math.round((Date.now() - sessionStartedAt.current) / 1000)))
      setCompleted(true)
      return
    }

    setCurrentIndex((value) => value + 1)
  }, [currentIndex, words.length])

  const schedulePostAnswerTransition = useCallback(() => {
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
  }, [moveToNextWord, recapEnabled])

  const submitOutcome = useCallback(async (correct: boolean) => {
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
  }, [currentWord, schedulePostAnswerTransition, session, submitReviewMutation])

  const handlePronunciationAudio = useCallback(async (audio: Blob) => {
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
      } else {
        setPronunciationFailed(true)
      }
    } catch (error) {
      setPronunciationError(getPronunciationAssessmentErrorMessage(error))
    }
  }, [currentWord, pronunciationAttempts, pronunciationMutation, submitOutcome])

  const startRecording = useCallback(async () => {
    setPronunciationError(null)
    pronunciationMutation.reset()
    try {
      recordingRef.current = await startPcmRecording(handlePronunciationAudio)
      setIsRecording(true)
    } catch {
      setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    }
  }, [handlePronunciationAudio, pronunciationMutation])

  async function startReview() {
    if (!boardId) return

    await startSessionMutation.mutateAsync({
      boardId,
      orderType,
      mode: reviewMode,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }

  const checkTypedAnswer = useCallback(() => {
    if (!currentWord || isAutoAdvancing) return
    const correct = normalizeAnswer(typedAnswer) === normalizeAnswer(currentWord.word)
    void submitOutcome(correct)
  }, [currentWord, isAutoAdvancing, submitOutcome, typedAnswer])

  useEffect(() => {
    if (!session || !currentWord || completed) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab' && currentWord.mode !== 'meaningToWord' && !showRecap) {
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
        if (currentWord.mode !== 'pronunciation' && normalizeAnswer(typedAnswer).length > 0) {
          event.preventDefault()
          checkTypedAnswer()
        }
        return
      }

      if (event.key === 'Escape' && !showRecap && !isAutoAdvancing && !isRecording && !submitReviewMutation.isPending) {
        event.preventDefault()
        void submitOutcome(false)
        return
      }

      if ((event.key === 'r' || event.key === 'R') && currentWord.mode === 'pronunciation') {
        const target = event.target as HTMLElement | null
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
        if (!isInput && !isRecording && recordingSupported && !pronunciationMutation.isPending && !isAutoAdvancing && pronunciationAttempts < 2) {
          event.preventDefault()
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && currentWord.mode === 'pronunciation' && isRecording) {
        event.preventDefault()
        void recordingRef.current?.stop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [checkTypedAnswer, completed, currentLanguage, currentWord, feedback, isAutoAdvancing, isRecording, moveToNextWord, pronunciationAttempts, pronunciationMutation.isPending, recordingSupported, session, showRecap, startRecording, submitOutcome, submitReviewMutation.isPending, typedAnswer])

  const noBoardSelected = !boardId
  const noDueWords = Boolean(activeBoard) && (activeBoard?.dueCount ?? 0) === 0


  return (
    <>
      <div className={`flex h-full min-h-0 flex-col ${session ? 'overflow-y-auto' : 'overflow-hidden'}`} data-testid="review-page">
        {!session ? <ReviewSetup boardId={boardId} boards={boards} reviewMode={reviewMode} orderType={orderType} recapEnabled={recapEnabled} noBoardSelected={noBoardSelected} noDueWords={noDueWords} isStarting={startSessionMutation.isPending} hasStartError={startSessionMutation.isError} onBoardChange={setBoardId} onModeChange={setReviewMode} onOrderChange={setOrderType} onRecapChange={setRecapEnabled} onStart={() => void startReview()} /> : null}

        {session && session.words.length === 0 ? <section className="review-summary" data-testid="review-summary"><CheckCircle2 size={38} /><span className="preview-label">All clear</span><h1>{session.boardName}</h1><p>No words are available in the remaining queue for this session.</p><button className="primary-button review-summary__done" type="button" onClick={resetToLanding}>Finish</button></section> : null}

        {session && currentWord && !completed ? (
          <section className={`review-session ${usesLargeSessionLayout ? 'learning-session--focused' : ''}`}>
            <ReviewProgress orderLabel={session.orderType === 'shuffle' ? 'Shuffle' : 'Sequential'} currentIndex={currentIndex} totalWords={words.length} focused={Boolean(usesLargeSessionLayout)} />
            <article className={`review-card review-card--${currentWord.mode} ${feedback ? `review-card--feedback-${feedback}` : ''} ${usesLargeSessionLayout ? 'learning-card--focused' : ''}`} data-testid="active-review-card">
              {feedback ? <div className={`review-feedback review-feedback--${feedback}`} role="status" aria-live="polite">{feedback === 'correct' ? 'Correct' : 'Wrong'}</div> : showRecap ? <ReviewRecap word={currentWord} isLastWord={currentIndex + 1 >= words.length} onContinue={moveToNextWord} /> : <ReviewModeSurface mode={currentWord.mode === 'random' ? 'dictation' : currentWord.mode} word={currentWord} typedAnswer={typedAnswer} usesLargeAnswerLayout={Boolean(usesLargeAnswerLayout)} isAutoAdvancing={isAutoAdvancing} isSubmitting={submitReviewMutation.isPending} isRecording={isRecording} isAssessmentPending={pronunciationMutation.isPending} recordingSupported={recordingSupported} pronunciationAttempts={pronunciationAttempts} pronunciationFailed={pronunciationFailed} pronunciationError={pronunciationError} onPlayAudio={() => speakWord(currentWord.word, currentLanguage)} onAnswerChange={setTypedAnswer} onCheckAnswer={checkTypedAnswer} onSkip={() => void submitOutcome(false)} onStartRecording={() => void startRecording()} onStopRecording={() => void recordingRef.current?.stop()} />}
            </article>
            {!feedback ? <ShortcutGuide mode={showRecap ? 'recap' : currentWord.mode === 'random' ? 'dictation' : currentWord.mode} /> : null}
            {submitReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to record this answer. Try again.</p> : null}
          </section>
        ) : null}

        {completed && session ? <ReviewCompletion orderLabel={session.orderType === 'shuffle' ? 'Shuffle' : 'Sequential'} totalWords={words.length} boardName={session.boardName} correctCount={correctCount} wrongCount={wrongCount} elapsedSeconds={completedElapsedSeconds} onDone={resetToLanding} /> : null}

      </div>
    </>
  )
}
