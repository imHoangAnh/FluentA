import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import type { PracticeReviewLevel, PracticeReviewStatus, PracticeSessionItem, PracticeStep } from '../api/practice.api'
import { practiceKeys } from '../api/practice.queries'
import {
  startPcmRecording,
  supportsPcmRecording,
  type ActivePcmRecording,
  type PronunciationAssessment,
} from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'
import { toast } from '@/shared/lib/toast'
import { PracticeModeSurface } from '../components/session/PracticeModeSurface'
import { PracticeProgress } from '../components/session/PracticeProgress'
import { PracticeRecap } from '../components/session/PracticeRecap'
import { PracticeCompletion } from '../components/session/PracticeCompletion'
import '../components/session/practice-session.css'

type PracticeOutcome = 'correct' | 'wrong'
type PendingTransition = { currentItemIndex: number; nextStep: PracticeStep | null; fromIndex: number; fromStep: PracticeStep }
type Recovery = { item: PracticeSessionItem; step: PracticeStep; requestId?: string; recap?: boolean }

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

export function PracticeSessionPage() {
  const { sessionId = '' } = useParams()
  return <SessionPracticePage key={sessionId} />
}

function SessionPracticePage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRecovering, setIsRecovering] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<PracticeReviewLevel | null>(null)
  const recoveryRef = useRef<Recovery | null>(null)
  const requestRef = useRef<{ key: string; id: string } | null>(null)
  const busyRef = useRef(false)
  const abandonedRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const currentSessionRef = useRef<practiceApi.PracticeSession | null>(null)
  const interactionPositionRef = useRef<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<PracticeOutcome | null>(null)
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null)
  const [pronunciationError, setPronunciationError] = useState<string | null>(null)
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationAssessment | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, PracticeReviewStatus>>({})
  const recordingRef = useRef<ActivePcmRecording | null>(null)
  const stepStartedAtRef = useRef<number | null>(null)

  const cancelSessionRead = () => queryClient.cancelQueries({ queryKey: practiceKeys.session(sessionId) })
  const answerMutation = useMutation({ mutationFn: (input: practiceApi.SubmitPracticeAnswerInput) => practiceApi.submitPracticeAnswer(sessionId, input), onMutate: cancelSessionRead })
  const pronunciationMutation = useMutation({ mutationFn: practiceApi.submitPracticePronunciationAttempt, onMutate: cancelSessionRead })
  const reviewLevelMutation = useMutation({ mutationFn: practiceApi.setPracticeReviewLevel, onMutate: cancelSessionRead })
  const completeMutation = useMutation({
    onMutate: cancelSessionRead,
    mutationFn: async (input: { sessionId: string; timeZoneId: string }) => {
      try { await practiceApi.completePracticeSession(input) } catch (error) {
        // Completion can succeed even if the HTTP response is lost.
        try {
          const fresh = await practiceApi.getPracticeSession(input.sessionId)
          queryClient.setQueryData(practiceKeys.session(input.sessionId), fresh)
          if (fresh.status === 'completed') return
        } catch { /* Keep the explicit finish retry available. */ }
        throw error
      }
    },
    onSuccess: () => { if (mountedRef.current) navigate('/practice') },
  })

  const mutationPending = answerMutation.isPending || pronunciationMutation.isPending || reviewLevelMutation.isPending || completeMutation.isPending
  const sessionQuery = useQuery({
    queryKey: practiceKeys.session(sessionId),
    queryFn: ({ signal }) => practiceApi.getPracticeSession(sessionId, signal),
    enabled: Boolean(sessionId) && !mutationPending && !isRecovering,
    // Notice abandonment even while the learner is recording in a visible tab.
    refetchInterval: query => query.state.data?.status === 'active' ? 10_000 : false,
  })

  const session = sessionQuery.data ?? null
  useEffect(() => { currentSessionRef.current = session }, [session])
  const activeIndex = pendingTransition?.fromIndex ?? session?.currentItemIndex ?? 0
  const currentItem: PracticeSessionItem | null = session?.items[activeIndex] ?? null
  const activeStep = pendingTransition?.fromStep ?? currentItem?.currentStep ?? null
  const language = session?.boardLanguage || 'en'
  const currentWord = currentItem?.word
  const recordingSupported = supportsPcmRecording()
  const isSaving = isRecovering || Boolean(connectionError) || session?.status !== 'active' || answerMutation.isPending || pronunciationMutation.isPending || reviewLevelMutation.isPending || completeMutation.isPending

  function requestFor(key: string) {
    if (requestRef.current?.key !== key) requestRef.current = { key, id: crypto.randomUUID() }
    return requestRef.current.id
  }

  useEffect(() => {
    if (session && stepStartedAtRef.current === null) stepStartedAtRef.current = Date.now()
  }, [session])

  const clearInteraction = useCallback(() => {
    setTypedAnswer('')
    setSelectedSlotId(null)
    setFeedback(null)
    setPendingTransition(null)
    setPronunciationError(null)
    setPronunciationFeedback(null)
    setSelectedLevel(null)
    setConnectionError(null)
    recoveryRef.current = null
    requestRef.current = null
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)
    stepStartedAtRef.current = Date.now()
  }, [])

  const finishSession = useCallback(() => {
    if (!sessionId || completeMutation.isPending) return
    completeMutation.mutate({ sessionId, timeZoneId: APP_TIME_ZONE })
  }, [completeMutation, sessionId])

  const moveToServerPosition = useCallback((nextIndex: number, nextStep: PracticeStep | null) => {
    if (!mountedRef.current) return
    clearInteraction()
    const nextItem = session?.items[nextIndex]
    const resolvedStep = nextStep ?? nextItem?.currentStep ?? (nextIndex < (session?.items.length ?? 0) ? 'dictation' : null)
    queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), current => current ? {
      ...current, currentItemIndex: nextIndex,
      items: current.items.map((item, index) => index === nextIndex && resolvedStep ? { ...item, currentStep: resolvedStep } : item),
    } : current)
    if (session && nextIndex >= session.items.length) finishSession()
  }, [clearInteraction, finishSession, queryClient, session, sessionId])

  const recoverProgress = useCallback(async (recovery: Recovery) => {
    recoveryRef.current = recovery
    setIsRecovering(true)
    try {
      await queryClient.cancelQueries({ queryKey: practiceKeys.session(sessionId) })
      const fresh = await practiceApi.getPracticeSession(sessionId)
      queryClient.setQueryData(practiceKeys.session(sessionId), fresh)
      if (!mountedRef.current) return false
      setConnectionError(null)
      const item = fresh.items.find(candidate => candidate.itemId === recovery.item.itemId)
      const progressed = fresh.status !== 'active' || fresh.currentItemIndex !== recovery.item.position || item?.currentStep !== recovery.step || item.isCompleted
      const savedAttempt = item?.lastAttempt
      const saved = progressed || Boolean(recovery.requestId && savedAttempt?.requestId === recovery.requestId)
        || (item?.attemptCount ?? 0) > (recovery.item.attemptCount ?? 0)
      if (saved) {
        clearInteraction()
        answerMutation.reset()
        reviewLevelMutation.reset()
        pronunciationMutation.reset()
        if (!progressed && savedAttempt) {
          setFeedback(savedAttempt.correctness ? 'correct' : 'wrong')
          setPronunciationFeedback(savedAttempt.assessment)
        }
        if (fresh.status === 'active' && fresh.currentItemIndex >= fresh.items.length) finishSession()
      } else if (recovery.recap) {
        toast.error('Fail to add word to review, please try again')
      } else if (recovery.step === 'pronunciation') {
        setPronunciationError('Your recording was not saved. Please record and try again.')
      }
      recoveryRef.current = null
      return saved
    } catch {
      setConnectionError('Cannot confirm your saved progress. Check your connection and retry.')
      if (recovery.recap) toast.error('Fail to add word to review, please try again')
      return false
    } finally {
      setIsRecovering(false)
    }
  }, [answerMutation, clearInteraction, finishSession, pronunciationMutation, queryClient, reviewLevelMutation, sessionId])

  useEffect(() => {
    if (session?.status !== 'abandoned' || abandonedRef.current === sessionId) return
    abandonedRef.current = sessionId
    clearInteraction()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    toast.error('This practice session ended because its vocabulary was permanently deleted. Please start another session.')
    navigate('/practice', { replace: true })
  }, [clearInteraction, navigate, session?.status, sessionId])

  const completeTransition = useCallback(() => {
    if (!pendingTransition) return
    const fresh = queryClient.getQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId))
    moveToServerPosition(fresh?.currentItemIndex ?? pendingTransition.currentItemIndex, fresh?.items[fresh.currentItemIndex]?.currentStep ?? pendingTransition.nextStep)
  }, [moveToServerPosition, pendingTransition, queryClient, sessionId])

  const durationForCurrentStep = () => {
    const now = Date.now()
    const startedAt = stepStartedAtRef.current
    stepStartedAtRef.current = now
    return startedAt === null ? 0 : Math.max(0, now - startedAt)
  }

  const handleAnswerResult = useCallback((result: practiceApi.SubmitPracticeAnswerResult, wasSkip: boolean) => {
    const requestId = requestRef.current?.id ?? ''
    requestRef.current = null
    queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), current => current ? {
      ...current, currentItemIndex: result.currentItemIndex, status: result.status,
      items: current.items.map((item, index) => ({ ...item,
        ...(item.itemId === result.itemId ? { attemptCount: (item.attemptCount ?? 0) + 1,
          lastAttempt: { requestId, step: result.step, correctness: result.correctness, isSkip: wasSkip, attemptNumber: null, assessment: null } } : {}),
        ...(index === result.currentItemIndex && result.nextStep ? { currentStep: result.nextStep } : {}),
      })),
    } : current)
    if (result.correctness) {
      setFeedback('correct')
      stepStartedAtRef.current = Date.now()
      setPendingTransition({ currentItemIndex: result.currentItemIndex, nextStep: result.nextStep, fromIndex: activeIndex, fromStep: activeStep! })
      return
    }

    setFeedback('wrong')
    stepStartedAtRef.current = Date.now()
    if (wasSkip || !result.canRetry) {
      setPendingTransition({ currentItemIndex: result.currentItemIndex, nextStep: result.nextStep, fromIndex: activeIndex, fromStep: activeStep! })
    }
  }, [activeIndex, activeStep, queryClient, sessionId])

  const submitTypedAnswer = useCallback(async () => {
    if (!session || !currentItem || activeStep !== 'dictation' || typedAnswer.trim().length === 0 || isSaving || pendingTransition || busyRef.current) return
    busyRef.current = true
    const requestId = requestFor(`${currentItem.itemId}:${activeStep}:${typedAnswer}`)
    try {
      const result = await answerMutation.mutateAsync({
        itemId: currentItem.itemId,
        step: activeStep,
        answerText: typedAnswer,
        durationMs: durationForCurrentStep(),
        requestId,
      })
      handleAnswerResult(result, false)
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, requestId })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, pendingTransition, recoverProgress, session, typedAnswer])

  const skipCurrentStep = useCallback(async () => {
    if (!session || !currentItem || !activeStep || isSaving || pendingTransition || busyRef.current) return
    busyRef.current = true
    const requestId = requestFor(`${currentItem.itemId}:${activeStep}:skip`)
    if (activeStep === 'recap') {
      try {
        const result = await answerMutation.mutateAsync({ itemId: currentItem.itemId, step: activeStep, skip: true, durationMs: durationForCurrentStep(), requestId })
        moveToServerPosition(result.currentItemIndex, result.nextStep)
      } catch {
        await recoverProgress({ item: currentItem, step: activeStep, requestId })
      } finally {
        busyRef.current = false
      }
      return
    }

    try {
      const result = await answerMutation.mutateAsync({ itemId: currentItem.itemId, step: activeStep, skip: true, durationMs: durationForCurrentStep(), requestId })
      handleAnswerResult(result, true)
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, requestId })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, moveToServerPosition, pendingTransition, recoverProgress, session])

  const selectMeaning = useCallback(async (answerSlotId: string) => {
    if (!currentItem || activeStep !== 'wordToMeaning' || isSaving || pendingTransition || busyRef.current) return
    busyRef.current = true
    const requestId = requestFor(`${currentItem.itemId}:${activeStep}:${answerSlotId}`)
    setSelectedSlotId(answerSlotId)
    try {
      const result = await answerMutation.mutateAsync({
        itemId: currentItem.itemId,
        step: activeStep,
        answerSlotId,
        durationMs: durationForCurrentStep(),
        requestId,
      })
      handleAnswerResult(result, false)
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, requestId })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, pendingTransition, recoverProgress])

  const handlePronunciationAudio = useCallback(async (audio: Blob) => {
    recordingRef.current = null
    setIsRecording(false)
    const latest = currentSessionRef.current
    if (!mountedRef.current || !session || !currentItem || activeStep !== 'pronunciation' || latest?.status !== 'active'
      || latest.items[latest.currentItemIndex]?.itemId !== currentItem.itemId || latest.items[latest.currentItemIndex]?.currentStep !== 'pronunciation' || busyRef.current) return
    busyRef.current = true
    const requestId = requestFor(`${currentItem.itemId}:pronunciation:${crypto.randomUUID()}`)

    try {
      const result = await pronunciationMutation.mutateAsync({
        sessionId: session.sessionId,
        itemId: currentItem.itemId,
        audio,
        durationMs: durationForCurrentStep(),
        requestId,
      })
      setPronunciationFeedback(result.assessment)
      handleAnswerResult({ ...result, step: 'pronunciation', correctness: result.isCorrect, canRetry: !result.isCorrect }, false)
      queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), current => current ? {
        ...current, items: current.items.map(item => item.itemId === currentItem.itemId ? { ...item, pronunciationAttemptCount: result.attemptNumber } : item),
      } : current)
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, requestId })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, currentItem, handleAnswerResult, pronunciationMutation, queryClient, recoverProgress, session, sessionId])

  const startRecording = useCallback(async () => {
    if (isSaving || pendingTransition || isRecording || !recordingSupported) return
    setPronunciationError(null)
    try {
      const recording = await startPcmRecording(handlePronunciationAudio)
      if (!mountedRef.current || currentSessionRef.current?.status !== 'active') {
        await recording.cancel()
        return
      }
      recordingRef.current = recording
      setIsRecording(true)
    } catch {
      setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    }
  }, [handlePronunciationAudio, isRecording, isSaving, pendingTransition, recordingSupported])

  const stopRecording = useCallback(() => {
    void recordingRef.current?.stop()
  }, [])

  const selectReviewLevel = useCallback(async (level: PracticeReviewLevel) => {
    if (!session || !currentItem || activeStep !== 'recap' || isSaving || currentItem.alreadyInReview || busyRef.current) return
    busyRef.current = true
    setSelectedLevel(level)
    try {
      const result = await reviewLevelMutation.mutateAsync({
        sessionId: session.sessionId,
        wordId: currentItem.wordId,
        level,
        timeZoneId: APP_TIME_ZONE,
      })
      setReviewStatuses((current) => ({ ...current, [currentItem.wordId]: result.status }))
      if (result.itemCompleted) moveToServerPosition(result.currentItemIndex, session.items[result.currentItemIndex]?.currentStep ?? (result.currentItemIndex < session.items.length ? 'dictation' : null))
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, recap: true })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, currentItem, isSaving, moveToServerPosition, recoverProgress, reviewLevelMutation, session])

  useEffect(() => {
    if (!currentWord || !activeStep || pendingTransition || activeStep === 'wordToMeaning' || activeStep === 'recap') return
    speakWord(currentWord, language)
  }, [activeStep, currentWord, language, pendingTransition])

  useEffect(() => {
    mountedRef.current = true
    return () => {
    mountedRef.current = false
    void recordingRef.current?.cancel()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const interactionPosition = currentItem && activeStep ? `${currentItem.itemId}:${activeStep}` : null
  useEffect(() => {
    if (interactionPositionRef.current && interactionPositionRef.current !== interactionPosition) clearInteraction()
    interactionPositionRef.current = interactionPosition
  }, [clearInteraction, interactionPosition])

  useEffect(() => {
    if (!currentItem || !activeStep) return
    const word = currentItem.word

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTextEntry = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (event.key === 'Tab' && activeStep !== 'wordToMeaning' && activeStep !== 'recap' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        speakWord(word, language)
        return
      }

      if (event.key === 'Enter') {
        if (activeStep === 'recap' && !target?.closest('button')) {
          event.preventDefault()
          void skipCurrentStep()
          return
        }
        if (pendingTransition && !target?.closest('button')) {
          event.preventDefault()
          completeTransition()
          return
        }
        if (activeStep === 'dictation' && !isTextEntry && typedAnswer.trim().length > 0) {
          event.preventDefault()
          void submitTypedAnswer()
        }
        return
      }

      if (event.key === 'Escape' && !pendingTransition && !isSaving) {
        event.preventDefault()
        void skipCurrentStep()
        return
      }

      if (activeStep === 'wordToMeaning' && /^[1-4]$/.test(event.key) && !isTextEntry && !target?.closest('button') && !event.altKey && !event.ctrlKey && !event.metaKey && !isSaving && !pendingTransition) {
        const slot = currentItem.answerSlots[Number(event.key) - 1]
        if (slot?.meaning?.trim()) {
          event.preventDefault()
          void selectMeaning(slot.slotId)
        }
        return
      }

      if ((event.key === 'r' || event.key === 'R') && activeStep === 'pronunciation' && !isTextEntry && !isRecording && !isSaving && !pendingTransition) {
        event.preventDefault()
        void startRecording()
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && activeStep === 'pronunciation' && isRecording) {
        event.preventDefault()
        stopRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeStep, completeTransition, currentItem, isRecording, isSaving, language, pendingTransition, selectMeaning, selectReviewLevel, skipCurrentStep, startRecording, stopRecording, submitTypedAnswer, typedAnswer])

  const currentReviewStatus: PracticeReviewStatus | null = currentItem
    ? reviewStatuses[currentItem.wordId] ?? (currentItem.alreadyInReview ? 'alreadyInReview' : null)
    : null
  const pendingTransitionLabel = pendingTransition
    ? pendingTransition.nextStep === null
      ? 'Finish practice'
      : pendingTransition.currentItemIndex === activeIndex
        ? 'Continue to the next step'
        : 'Continue to the next word'
    : null

  if (sessionQuery.isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading practice session...</p>
  if (sessionQuery.isError || !session) return <div className="grid gap-3"><p role="alert" className="text-sm text-destructive">This practice session is unavailable.</p><button className="w-fit rounded-md border border-border bg-card px-4 py-2 text-sm font-medium" type="button" onClick={() => navigate('/practice')}>Back to decks</button></div>
  if (session.status === 'completed') return <PracticeCompletion isSaving={false} isCompleted onFinish={() => navigate('/practice')} />
  if (session.status === 'abandoned') return <p role="status">Returning to practice decks…</p>
  if (session.items.length === 0) return <div className="grid gap-3"><p role="status" className="text-sm text-muted-foreground">This page has no words to practice.</p><button className="w-fit rounded-md border border-border bg-card px-4 py-2 text-sm font-medium" type="button" onClick={() => navigate('/practice')}>Back to decks</button></div>
  if (!currentItem || !activeStep) return <PracticeCompletion isSaving={completeMutation.isPending} hasError={completeMutation.isError} onFinish={finishSession} />

  return (
    <>
      <section className={`figma-learning-session practice-figma-session practice-figma-session--${activeStep}`}>
        <header className="practice-figma-session__header">
          <span className="practice-figma-session__brand">FluentA</span>
          <button className="practice-figma-session__exit" type="button" onClick={() => navigate('/practice')}>Exit session</button>
        </header>
        <PracticeProgress currentIndex={activeIndex} totalCards={session.items.length} step={activeStep} />
        <article className={`practice-figma-session__card practice-figma-session__card--${activeStep}`} data-testid="active-practice-card">
          {activeStep === 'recap' ? (
            <PracticeRecap
              item={currentItem}
              reviewStatus={currentReviewStatus}
              isSaving={isSaving}
              saveError={answerMutation.isError || reviewLevelMutation.isError || completeMutation.isError}
              selectedLevel={selectedLevel}
              onRetry={() => { if (selectedLevel != null) void selectReviewLevel(selectedLevel) }}
              onSelectLevel={(level) => void selectReviewLevel(level)}
              onSkip={() => void skipCurrentStep()}
            />
          ) : (
            <PracticeModeSurface
              mode={activeStep}
              item={currentItem}
              typedAnswer={typedAnswer}
              selectedSlotId={selectedSlotId}
              feedback={feedback}
              isResolved={Boolean(pendingTransition)}
              isBusy={isSaving}
              pronunciationFeedback={pronunciationFeedback}
              recordingSupported={recordingSupported}
              isRecording={isRecording}
              pronunciationError={pronunciationError}
              onPlayAudio={() => speakWord(currentItem.word, language)}
              onAnswerChange={setTypedAnswer}
              onSubmit={() => void submitTypedAnswer()}
              onSelectSlot={(slotId) => void selectMeaning(slotId)}
              onSkip={() => void skipCurrentStep()}
              onContinue={completeTransition}
              onStartRecording={() => void startRecording()}
              onStopRecording={stopRecording}
            />
          )}
        </article>
        {activeStep === 'pronunciation' ? <p role="status" className="text-center text-sm text-muted-foreground">Saved pronunciation attempts: {currentItem.pronunciationAttemptCount ?? 0}</p> : null}
        <p className="practice-figma-session__shortcuts" aria-label="Keyboard shortcuts">
          {pendingTransition ? <><kbd>Enter</kbd> {pendingTransitionLabel}</> : activeStep === 'dictation' ? <><kbd>Enter</kbd> Check answer <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip <span aria-hidden="true">·</span> <kbd>Tab</kbd> Play audio</> : activeStep === 'wordToMeaning' ? <>Click an answer to check <span aria-hidden="true">·</span> <kbd>1–4</kbd> Select and check <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip</> : activeStep === 'pronunciation' ? <><kbd>Tab</kbd> Listen <span aria-hidden="true">·</span> <kbd>R</kbd> Record <span aria-hidden="true">·</span> <kbd>Space</kbd> Stop and check <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip</> : <><kbd>Esc</kbd> Skip recap</>}
        </p>
      </section>
      {answerMutation.isError && activeStep !== 'recap' ? <p className="mt-3 text-sm text-destructive" role="alert">Unable to save your answer. Try again.</p> : null}
      {isRecovering ? <p role="status">Checking saved practice progress…</p> : null}
      {connectionError ? <div role="alert"><p>{connectionError}</p><button type="button" disabled={isRecovering} onClick={() => { if (recoveryRef.current) void recoverProgress(recoveryRef.current) }}>Retry connection</button></div> : null}
      {completeMutation.isError ? <p className="mt-3 text-sm text-destructive" role="alert">Unable to finish the practice session. Try again.</p> : null}
      {completeMutation.isPending ? <p className="mt-3 text-sm text-muted-foreground" role="status">Saving practice results…</p> : null}
    </>
  )
}
