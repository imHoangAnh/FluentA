import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as reviewApi from '../api/review.api'
import { reviewKeys } from '../api/review.queries'
import { getPronunciationAssessmentErrorMessage, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { ReviewCompletion } from '../components/session/ReviewCompletion'
import { ReviewModeSurface, type ReviewFeedback } from '../components/session/ReviewModeSurface'
import { ReviewProgress } from '../components/session/ReviewProgress'
import '../components/session/review-session.css'

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function statusIsComplete(status: string) {
  return status.toLowerCase() === 'complete' || status.toLowerCase() === 'completed'
}

function itemWithAnswerResult(item: reviewApi.ReviewSessionItem, result: reviewApi.ReviewAnswerResult): reviewApi.ReviewSessionItem {
  return {
    ...item,
    isReviewed: result.isReviewed || item.isReviewed,
    result: result.isReviewed ? result.result : item.result,
    levelBefore: result.levelBefore ?? item.levelBefore,
    levelAfter: result.levelAfter ?? item.levelAfter,
    nextReviewDateBefore: result.nextReviewDateBefore ?? item.nextReviewDateBefore,
    nextReviewDateAfter: result.nextReviewDateAfter ?? item.nextReviewDateAfter,
    pronunciationAttemptCount: item.mode === 'listenAndRepeat' ? result.attemptsUsed : item.pronunciationAttemptCount,
  }
}

function withAnswerResult(session: reviewApi.ReviewSession, result: reviewApi.ReviewAnswerResult): reviewApi.ReviewSession {
  return {
    ...session,
    completedWords: result.completedWords,
    currentItemIndex: result.currentItemIndex,
    status: result.sessionStatus,
    items: session.items.map((item) => item.itemId === result.itemId ? itemWithAnswerResult(item, result) : item),
  }
}

function feedbackFor(item: reviewApi.ReviewSessionItem, result: reviewApi.ReviewAnswerResult): ReviewFeedback {
  if (item.mode === 'listenAndRepeat' && !result.isReviewed && !result.correct) {
    const pronunciation = item.ipaPronunciation?.trim()
    return {
      kind: 'retry',
      title: '×  Pronunciation needs another try',
      message: `${pronunciation ? `Listen to /${pronunciation.replace(/^\/+|\/+$/g, '')}/ again.` : 'Listen to the word again.'} Press Enter to continue.`,
      item,
    }
  }

  if (result.correct) {
    return { kind: 'correct', title: '✓  Correct', message: 'Nice work. Press Enter to continue.', item }
  }

  if (item.mode === 'listenAndRepeat') {
    return { kind: 'wrong', title: '×  Not quite', message: 'Both attempts are used. Press Enter to continue.', item }
  }

  return { kind: 'wrong', title: '×  Not quite', message: `Correct answer: ${item.word}  ·  Press Enter to continue.`, item }
}

function ReviewSessionFrame({ onExit, children }: { onExit: () => void; children: ReactNode }) {
  return (
    <div className="review-figma-session" data-testid="review-page">
      <header className="review-figma-session__header">
        <span className="review-figma-session__brand">FluentA</span>
        <button className="review-figma-session__exit" type="button" onClick={onExit}>Exit session</button>
      </header>
      {children}
    </div>
  )
}

function ReviewShortcutGuide({ mode, feedback }: { mode: reviewApi.ReviewMode; feedback: ReviewFeedback | null }) {
  if (feedback) {
    return <p className="review-figma-session__shortcut"><kbd>Enter</kbd> Continue</p>
  }
  if (mode === 'listenAndRepeat') {
    return <p className="review-figma-session__shortcut"><kbd>Tab</kbd> Listen <span>·</span> <kbd>R</kbd> Record <span>·</span> <kbd>Space</kbd> Stop</p>
  }
  if (mode === 'meaningToWord') {
    return <p className="review-figma-session__shortcut"><kbd>Enter</kbd> Check answer <span>·</span> <kbd>Esc</kbd> Skip</p>
  }
  return <p className="review-figma-session__shortcut"><kbd>Enter</kbd> Check answer <span>·</span> <kbd>Esc</kbd> Skip <span>·</span> <kbd>Tab</kbd> Play audio</p>
}

function ReviewStateCard({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="review-figma-session__card review-figma-session__state-card">
      <div className="review-figma-session__state-content">
        <h1>{title}</h1>
        <p>{message}</p>
        <button className="review-figma-session__done-button" type="button" onClick={onAction}>{actionLabel}</button>
      </div>
    </section>
  )
}

export function ReviewSessionPage() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [typedAnswer, setTypedAnswer] = useState('')
  const [outcomeFeedback, setOutcomeFeedback] = useState<ReviewFeedback | null>(null)
  const [pronunciationError, setPronunciationError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const recordingRef = useRef<ActivePcmRecording | null>(null)
  const cardStartedAt = useRef(0)
  const recordingSupported = supportsPcmRecording()

  const sessionQuery = useQuery({
    queryKey: reviewKeys.session(sessionId ?? ''),
    queryFn: () => reviewApi.getReviewSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 15_000,
  })
  const session = sessionQuery.data

  const answerMutation = useMutation({
    mutationFn: reviewApi.submitReviewAnswer,
    onSuccess: (result, variables) => {
      const queryKey = reviewKeys.session(variables.sessionId)
      const current = queryClient.getQueryData<reviewApi.ReviewSession>(queryKey)
      const answeredItem = current?.items.find((item) => item.itemId === result.itemId)
      queryClient.setQueryData<reviewApi.ReviewSession>(queryKey, (cached) => cached ? withAnswerResult(cached, result) : cached)
      if (answeredItem) setOutcomeFeedback(feedbackFor(itemWithAnswerResult(answeredItem, result), result))
      setPronunciationError(null)
    },
  })
  const pronunciationMutation = useMutation({
    mutationFn: reviewApi.submitReviewPronunciation,
    onSuccess: (result, variables) => {
      const queryKey = reviewKeys.session(variables.sessionId)
      const current = queryClient.getQueryData<reviewApi.ReviewSession>(queryKey)
      const answeredItem = current?.items.find((item) => item.itemId === result.itemId)
      queryClient.setQueryData<reviewApi.ReviewSession>(queryKey, (cached) => cached ? withAnswerResult(cached, result) : cached)
      cardStartedAt.current = Date.now()
      setPronunciationError(null)
      if (answeredItem) setOutcomeFeedback(feedbackFor(itemWithAnswerResult(answeredItem, result), result))
    },
    onError: (error) => {
      cardStartedAt.current = Date.now()
      setPronunciationError(getPronunciationAssessmentErrorMessage(error))
    },
  })

  const currentItem = session?.currentItemIndex === null || session?.currentItemIndex === undefined
    ? null
    : session.items[session.currentItemIndex] ?? session.items.find((item) => !item.isReviewed) ?? null
  const sessionComplete = Boolean(session && (
    statusIsComplete(session.status)
    || session.currentItemIndex === null
    || session.currentItemIndex >= session.items.length
  ))
  const correctCount = useMemo(() => session?.items.filter((item) => item.result?.toLowerCase() === 'correct').length ?? 0, [session?.items])
  const wrongCount = useMemo(() => session?.items.filter((item) => item.result?.toLowerCase() === 'wrong').length ?? 0, [session?.items])

  const playCurrentWord = useCallback(() => {
    const item = outcomeFeedback?.item ?? currentItem
    if (item) speakWord(item.word, item.language || 'en')
  }, [currentItem, outcomeFeedback])

  const handleRecordingResult = useCallback(async (audio: Blob) => {
    recordingRef.current = null
    setIsRecording(false)
    if (!session || !currentItem) return

    setPronunciationError(null)
    await pronunciationMutation.mutateAsync({
      sessionId: session.sessionId,
      itemId: currentItem.itemId,
      audio,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - cardStartedAt.current) / 1000)),
    }).catch(() => undefined)
  }, [currentItem, pronunciationMutation, session])

  const startRecording = useCallback(async () => {
    if (!currentItem || outcomeFeedback || pronunciationMutation.isPending || !recordingSupported || currentItem.pronunciationAttemptCount >= 2) return
    setPronunciationError(null)
    pronunciationMutation.reset()
    try {
      recordingRef.current = await startPcmRecording(handleRecordingResult)
      setIsRecording(true)
    } catch {
      cardStartedAt.current = Date.now()
      setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    }
  }, [currentItem, handleRecordingResult, outcomeFeedback, pronunciationMutation, recordingSupported])

  const stopRecording = useCallback(() => {
    void recordingRef.current?.stop()
  }, [])

  const submitTypedAnswer = useCallback((answerText: string) => {
    if (!session || !currentItem || answerMutation.isPending || outcomeFeedback) return
    answerMutation.mutate({
      sessionId: session.sessionId,
      itemId: currentItem.itemId,
      answerText,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - cardStartedAt.current) / 1000)),
    })
  }, [answerMutation, currentItem, outcomeFeedback, session])

  const finishSession = useCallback(() => {
    const navigationState = location.state as { returnTo?: string } | null
    navigate(navigationState?.returnTo || '/', { replace: true })
  }, [location.state, navigate])

  const continueAfterFeedback = useCallback(() => {
    if (!outcomeFeedback) return
    setOutcomeFeedback(null)
    setTypedAnswer('')
    setPronunciationError(null)
    cardStartedAt.current = Date.now()
  }, [outcomeFeedback])

  useEffect(() => {
    const item = outcomeFeedback?.item ?? currentItem
    if (!session || !item || (sessionComplete && !outcomeFeedback)) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (outcomeFeedback) {
        if (event.key === 'Enter') {
          event.preventDefault()
          continueAfterFeedback()
        }
        return
      }

      if (event.key === 'Tab' && item.mode !== 'meaningToWord' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        playCurrentWord()
        return
      }

      if (event.key === 'Enter' && item.mode !== 'listenAndRepeat' && typedAnswer.trim().length > 0) {
        event.preventDefault()
        submitTypedAnswer(typedAnswer)
        return
      }

      if (event.key === 'Escape' && item.mode !== 'listenAndRepeat' && !answerMutation.isPending) {
        event.preventDefault()
        submitTypedAnswer('')
        return
      }

      if ((event.key === 'r' || event.key === 'R') && item.mode === 'listenAndRepeat') {
        if (!isInput && !isRecording && recordingSupported && !pronunciationMutation.isPending && item.pronunciationAttemptCount < 2) {
          event.preventDefault()
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && item.mode === 'listenAndRepeat' && isRecording) {
        event.preventDefault()
        stopRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerMutation.isPending, continueAfterFeedback, currentItem, isRecording, outcomeFeedback, playCurrentWord, pronunciationMutation.isPending, recordingSupported, session, sessionComplete, startRecording, stopRecording, submitTypedAnswer, typedAnswer])

  useEffect(() => () => {
    void recordingRef.current?.cancel()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    if (currentItem) cardStartedAt.current = Date.now()
  }, [currentItem])

  if (!sessionId) {
    return (
      <div className="review-figma-session" data-testid="review-page">
        <section className="review-figma-session__standalone">
          <div className="review-figma-session__standalone-content">
            <CheckCircle2 className="review-figma-session__completion-icon" aria-hidden="true" />
            <h1>Review</h1>
            <p>Open the Review dialog from the sidebar to see today’s due words.</p>
            <button className="review-figma-session__done-button" type="button" onClick={() => navigate('/?review=open')}>Open Review</button>
          </div>
        </section>
      </div>
    )
  }

  if (sessionQuery.isLoading) {
    return <ReviewSessionFrame onExit={finishSession}><div className="review-figma-session__loading" role="status" aria-label="Loading review session"><LoaderCircle aria-hidden="true" />Loading review session…</div></ReviewSessionFrame>
  }

  if (sessionQuery.isError || !session) {
    return <ReviewSessionFrame onExit={finishSession}><ReviewStateCard title="Session unavailable" message="Unable to load this review session." actionLabel="Try again" onAction={() => void sessionQuery.refetch()} /></ReviewSessionFrame>
  }

  if (session.totalWords === 0) {
    return <ReviewSessionFrame onExit={finishSession}><ReviewStateCard title="All clear" message="No words are due right now." actionLabel="Done" onAction={finishSession} /></ReviewSessionFrame>
  }

  if (session.status.toLowerCase() === 'abandoned') {
    return <ReviewSessionFrame onExit={finishSession}><ReviewStateCard title="Session unavailable" message="This session is no longer active." actionLabel="Done" onAction={finishSession} /></ReviewSessionFrame>
  }

  if (sessionComplete && !outcomeFeedback) {
    return <ReviewSessionFrame onExit={finishSession}><ReviewCompletion totalWords={session.totalWords} correctCount={correctCount} wrongCount={wrongCount} onDone={finishSession} /></ReviewSessionFrame>
  }

  const itemForExercise = outcomeFeedback?.item ?? currentItem
  if (!itemForExercise) {
    return <ReviewSessionFrame onExit={finishSession}><ReviewStateCard title="Session unavailable" message="This review session has no active word." actionLabel="Done" onAction={finishSession} /></ReviewSessionFrame>
  }

  const progressItemIndex = session.items.findIndex((item) => item.itemId === itemForExercise.itemId)
  const progressCurrentWord = progressItemIndex >= 0 ? progressItemIndex + 1 : Math.min(session.completedWords + 1, session.totalWords)
  const isBusy = answerMutation.isPending || pronunciationMutation.isPending || Boolean(outcomeFeedback)

  return (
    <ReviewSessionFrame onExit={finishSession}>
      <section className="review-figma-session__session-content">
        <ReviewProgress mode={itemForExercise.mode} currentWord={progressCurrentWord} totalWords={session.totalWords} />
        <article className="review-figma-session__card" data-testid="active-review-card">
          <ReviewModeSurface
            item={itemForExercise}
            typedAnswer={typedAnswer}
            feedback={outcomeFeedback}
            isBusy={isBusy}
            isRecording={isRecording}
            recordingSupported={recordingSupported}
            pronunciationError={pronunciationError}
            onPlayAudio={playCurrentWord}
            onAnswerChange={setTypedAnswer}
            onCheckAnswer={() => submitTypedAnswer(typedAnswer)}
            onSkip={() => submitTypedAnswer('')}
            onContinue={continueAfterFeedback}
            onToggleRecording={() => isRecording ? stopRecording() : void startRecording()}
          />
        </article>
        <ReviewShortcutGuide mode={itemForExercise.mode} feedback={outcomeFeedback} />
        {answerMutation.isError ? <p className="review-figma-session__error" role="alert">Unable to save this answer. Try again.</p> : null}
      </section>
    </ReviewSessionFrame>
  )
}
