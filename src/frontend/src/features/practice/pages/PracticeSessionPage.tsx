import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import type { PracticeReviewLevel, PracticeReviewStatus, PracticeSessionItem, PracticeStep } from '../api/practice.api'
import { practiceKeys } from '../api/practice.queries'
import {
  getPronunciationAssessmentErrorMessage,
  startPcmRecording,
  supportsPcmRecording,
  type ActivePcmRecording,
  type PronunciationAssessment,
} from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'
import { PracticeModeSurface } from '../components/session/PracticeModeSurface'
import { PracticeProgress } from '../components/session/PracticeProgress'
import { PracticeRecap } from '../components/session/PracticeRecap'
import { PracticeCompletion } from '../components/session/PracticeCompletion'
import '../components/session/practice-session.css'

type PracticeOutcome = 'correct' | 'wrong'
type PendingTransition = { currentItemIndex: number; nextStep: PracticeStep | null }
type SessionPosition = { sessionId: string; currentItemIndex: number; nextStep: PracticeStep | null }

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
  const navigate = useNavigate()
  const [sessionPosition, setSessionPosition] = useState<SessionPosition | null>(null)
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

  const sessionQuery = useQuery({
    queryKey: practiceKeys.session(sessionId),
    queryFn: () => practiceApi.getPracticeSession(sessionId),
    enabled: Boolean(sessionId),
  })
  const answerMutation = useMutation({ mutationFn: (input: practiceApi.SubmitPracticeAnswerInput) => practiceApi.submitPracticeAnswer(sessionId, input) })
  const pronunciationMutation = useMutation({ mutationFn: practiceApi.submitPracticePronunciationAttempt })
  const reviewLevelMutation = useMutation({ mutationFn: practiceApi.setPracticeReviewLevel })
  const completeMutation = useMutation({ mutationFn: practiceApi.completePracticeSession, onSuccess: () => navigate('/practice') })

  const session = sessionQuery.data ?? null
  const activePosition = sessionPosition?.sessionId === sessionId ? sessionPosition : null
  const activeIndex = activePosition?.currentItemIndex ?? session?.currentItemIndex ?? 0
  const currentItem: PracticeSessionItem | null = session?.items[activeIndex] ?? null
  const activeStep = activePosition ? activePosition.nextStep : currentItem?.currentStep ?? null
  const language = session?.boardLanguage || 'en'
  const recordingSupported = supportsPcmRecording()
  const isSaving = answerMutation.isPending || pronunciationMutation.isPending || reviewLevelMutation.isPending || completeMutation.isPending

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
    clearInteraction()
    const nextItem = session?.items[nextIndex]
    const resolvedStep = nextStep ?? nextItem?.currentStep ?? (nextIndex < (session?.items.length ?? 0) ? 'dictation' : null)
    setSessionPosition({ sessionId, currentItemIndex: nextIndex, nextStep: resolvedStep })
    if (session && nextIndex >= session.items.length) finishSession()
  }, [clearInteraction, finishSession, session, sessionId])

  const completeTransition = useCallback(() => {
    if (!pendingTransition) return
    moveToServerPosition(pendingTransition.currentItemIndex, pendingTransition.nextStep)
  }, [moveToServerPosition, pendingTransition])

  const durationForCurrentStep = () => {
    const now = Date.now()
    const startedAt = stepStartedAtRef.current
    stepStartedAtRef.current = now
    return startedAt === null ? 0 : Math.max(0, now - startedAt)
  }

  const handleAnswerResult = useCallback((result: practiceApi.SubmitPracticeAnswerResult, wasSkip: boolean) => {
    if (result.correctness) {
      setFeedback('correct')
      stepStartedAtRef.current = Date.now()
      setPendingTransition({ currentItemIndex: result.currentItemIndex, nextStep: result.nextStep })
      return
    }

    setFeedback('wrong')
    stepStartedAtRef.current = Date.now()
    if (wasSkip || !result.canRetry) {
      setPendingTransition({ currentItemIndex: result.currentItemIndex, nextStep: result.nextStep })
    }
  }, [])

  const submitTypedAnswer = useCallback(async () => {
    if (!session || !currentItem || activeStep !== 'dictation' || typedAnswer.trim().length === 0 || isSaving) return
    try {
      const result = await answerMutation.mutateAsync({
        itemId: currentItem.itemId,
        step: activeStep,
        answerText: typedAnswer,
        durationMs: durationForCurrentStep(),
      })
      handleAnswerResult(result, false)
    } catch {
      // Keep the answer in place so the learner can retry after a connection error.
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, session, typedAnswer])

  const skipCurrentStep = useCallback(async () => {
    if (!session || !currentItem || !activeStep || isSaving || pendingTransition) return
    if (activeStep === 'recap') {
      try {
        const result = await answerMutation.mutateAsync({ itemId: currentItem.itemId, step: activeStep, skip: true, durationMs: durationForCurrentStep() })
        moveToServerPosition(result.currentItemIndex, result.nextStep)
      } catch {
        // Keep the recap visible so the learner can retry advancing.
      }
      return
    }

    try {
      const result = await answerMutation.mutateAsync({ itemId: currentItem.itemId, step: activeStep, skip: true, durationMs: durationForCurrentStep() })
      handleAnswerResult(result, true)
    } catch {
      // Keep the current step visible so the learner can retry skipping.
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, moveToServerPosition, pendingTransition, session])

  const selectMeaning = useCallback(async (answerSlotId: string) => {
    if (!currentItem || activeStep !== 'wordToMeaning' || isSaving || pendingTransition) return
    setSelectedSlotId(answerSlotId)
    try {
      const result = await answerMutation.mutateAsync({
        itemId: currentItem.itemId,
        step: activeStep,
        answerSlotId,
        durationMs: durationForCurrentStep(),
      })
      handleAnswerResult(result, false)
    } catch {
      // Leave the selected choice in place for a retry.
    }
  }, [activeStep, answerMutation, currentItem, handleAnswerResult, isSaving, pendingTransition])

  const handlePronunciationAudio = useCallback(async (audio: Blob) => {
    recordingRef.current = null
    setIsRecording(false)
    if (!session || !currentItem || activeStep !== 'pronunciation') return

    try {
      const result = await pronunciationMutation.mutateAsync({
        sessionId: session.sessionId,
        itemId: currentItem.itemId,
        audio,
        durationMs: durationForCurrentStep(),
      })
      setPronunciationFeedback(result.assessment)
      if (result.isCorrect) {
        setFeedback('correct')
        stepStartedAtRef.current = Date.now()
        setPendingTransition({ currentItemIndex: result.currentItemIndex, nextStep: result.nextStep })
        return
      }

      setFeedback('wrong')
      stepStartedAtRef.current = Date.now()
    } catch (error) {
      setPronunciationError(getPronunciationAssessmentErrorMessage(error))
      stepStartedAtRef.current = Date.now()
    }
  }, [activeStep, currentItem, pronunciationMutation, session])

  const startRecording = useCallback(async () => {
    if (isSaving || pendingTransition || !recordingSupported) return
    setPronunciationError(null)
    try {
      recordingRef.current = await startPcmRecording(handlePronunciationAudio)
      setIsRecording(true)
    } catch {
      setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    }
  }, [handlePronunciationAudio, isSaving, pendingTransition, recordingSupported])

  const stopRecording = useCallback(() => {
    void recordingRef.current?.stop()
  }, [])

  const selectReviewLevel = useCallback(async (level: PracticeReviewLevel) => {
    if (!session || !currentItem || activeStep !== 'recap' || isSaving || currentItem.alreadyInReview) return
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
      // Keep the recap visible so the learner can retry choosing a level.
    }
  }, [activeStep, currentItem, isSaving, moveToServerPosition, reviewLevelMutation, session])

  useEffect(() => {
    if (!currentItem || !activeStep || pendingTransition || activeStep === 'wordToMeaning' || activeStep === 'recap') return
    speakWord(currentItem.word, language)
  }, [activeStep, currentItem, language, pendingTransition])

  useEffect(() => () => {
    void recordingRef.current?.cancel()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

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
        <p className="practice-figma-session__shortcuts" aria-label="Keyboard shortcuts">
          {pendingTransition ? <><kbd>Enter</kbd> {pendingTransitionLabel}</> : activeStep === 'dictation' ? <><kbd>Enter</kbd> Check answer <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip <span aria-hidden="true">·</span> <kbd>Tab</kbd> Play audio</> : activeStep === 'wordToMeaning' ? <>Click an answer to check <span aria-hidden="true">·</span> <kbd>1–4</kbd> Select and check <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip</> : activeStep === 'pronunciation' ? <><kbd>Tab</kbd> Listen <span aria-hidden="true">·</span> <kbd>R</kbd> Record <span aria-hidden="true">·</span> <kbd>Space</kbd> Stop and check <span aria-hidden="true">·</span> <kbd>Esc</kbd> Skip</> : <><kbd>Esc</kbd> Skip recap</>}
        </p>
      </section>
      {answerMutation.isError && activeStep !== 'recap' ? <p className="mt-3 text-sm text-destructive" role="alert">Unable to save your answer. Try again.</p> : null}
      {completeMutation.isError ? <p className="mt-3 text-sm text-destructive" role="alert">Unable to finish the practice session. Try again.</p> : null}
      {completeMutation.isPending ? <p className="mt-3 text-sm text-muted-foreground" role="status">Saving practice results…</p> : null}
    </>
  )
}
