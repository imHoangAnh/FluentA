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
type Recovery = { item: PracticeSessionItem; step: PracticeStep; requestId?: string; recap?: boolean; retry?: boolean }

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
  const [isStartingRecording, setIsStartingRecording] = useState(false)
  const startingRecordingRef = useRef(false)
  const suppressAutoSpeechRef = useRef(false)
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, PracticeReviewStatus>>({})
  const recordingRef = useRef<ActivePcmRecording | null>(null)
  const stepStartedAtRef = useRef<number | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const recordedAudioUrlRef = useRef<string | null>(null)
  const myVoiceAudioRef = useRef<HTMLAudioElement | null>(null)

  const cancelSessionRead = () => queryClient.cancelQueries({ queryKey: practiceKeys.session(sessionId) })
  const answerMutation = useMutation({ mutationFn: (input: practiceApi.SubmitPracticeAnswerInput) => practiceApi.submitPracticeAnswer(sessionId, input), onMutate: cancelSessionRead })
  const pronunciationMutation = useMutation({ mutationFn: practiceApi.submitPracticePronunciationAttempt, onMutate: cancelSessionRead })
  const retryMutation = useMutation({ mutationFn: practiceApi.retryPracticeStep, onMutate: cancelSessionRead })
  const [retryError, setRetryError] = useState<string | null>(null)
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

  const mutationPending = answerMutation.isPending || pronunciationMutation.isPending || retryMutation.isPending || reviewLevelMutation.isPending || completeMutation.isPending
  const sessionQuery = useQuery({
    queryKey: practiceKeys.session(sessionId),
    queryFn: ({ signal }) => practiceApi.getPracticeSession(sessionId, signal),
    enabled: Boolean(sessionId) && !mutationPending && !isRecovering,
    // Notice abandonment even while the learner is recording in a visible tab.
    refetchInterval: (query) => (query.state.data?.status === 'active' ? 10_000 : false),
  })

  const session = sessionQuery.data ?? null
  useEffect(() => { currentSessionRef.current = session }, [session])
  const activeIndex = pendingTransition?.fromIndex ?? session?.currentItemIndex ?? 0
  const currentItem: PracticeSessionItem | null = session?.items[activeIndex] ?? null
  const activeStep = pendingTransition?.fromStep ?? currentItem?.currentStep ?? null
  const language = session?.boardLanguage || 'en'
  const currentWord = currentItem?.word
  const recordingSupported = supportsPcmRecording()
  const isSaving = isRecovering || Boolean(connectionError) || session?.status !== 'active' || mutationPending || isStartingRecording
  const isLastItem = Boolean(session && activeIndex >= session.items.length - 1)
  const currentReviewStatus: PracticeReviewStatus | null = currentItem
    ? reviewStatuses[currentItem.wordId] ?? (currentItem.alreadyInReview ? 'alreadyInReview' : null)
    : null

  function requestFor(key: string) {
    if (requestRef.current?.key !== key) requestRef.current = { key, id: crypto.randomUUID() }
    return requestRef.current.id
  }

  useEffect(() => {
    if (session && stepStartedAtRef.current === null) stepStartedAtRef.current = Date.now()
  }, [session])

  const clearRecordedAudio = useCallback(() => {
    if (myVoiceAudioRef.current) {
      myVoiceAudioRef.current.pause()
      myVoiceAudioRef.current = null
    }
    if (recordedAudioUrlRef.current && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(recordedAudioUrlRef.current)
    }
    recordedAudioUrlRef.current = null
    setRecordedAudioUrl(null)
  }, [])

  const clearInteraction = useCallback(() => {
    setTypedAnswer('')
    setSelectedSlotId(null)
    setFeedback(null)
    setPendingTransition(null)
    setPronunciationError(null)
    setPronunciationFeedback(null)
    setSelectedLevel(null)
    setConnectionError(null)
    setRetryError(null)
    recoveryRef.current = null
    requestRef.current = null
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)
    clearRecordedAudio()
    stepStartedAtRef.current = Date.now()
  }, [clearRecordedAudio])

  const finishSession = useCallback(() => {
    if (!sessionId || completeMutation.isPending) return
    completeMutation.mutate({ sessionId, timeZoneId: APP_TIME_ZONE })
  }, [completeMutation, sessionId])

  const moveToServerPosition = useCallback((nextIndex: number, nextStep: PracticeStep | null) => {
    if (!mountedRef.current) return
    clearInteraction()
    const nextItem = session?.items[nextIndex]
    const resolvedStep = nextStep ?? nextItem?.currentStep ?? (nextIndex < (session?.items.length ?? 0) ? 'dictation' : null)
    queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), (current) => (current ? {
      ...current,
      currentItemIndex: nextIndex,
      items: current.items.map((item, index) => (index === nextIndex && resolvedStep ? { ...item, currentStep: resolvedStep } : item)),
    } : current))
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
      const item = fresh.items.find((candidate) => candidate.itemId === recovery.item.itemId)
      if (recovery.retry) {
        const sameAttempt = item?.lastAttempt?.requestId === recovery.item.lastAttempt?.requestId
        const reopened = fresh.status === 'active' && fresh.currentItemIndex === recovery.item.position
          && item?.currentStep === recovery.step && sameAttempt && !item.isCompleted
        const unchanged = fresh.status === 'active' && fresh.currentItemIndex === recovery.item.position
          && item?.currentStep === recovery.item.currentStep && sameAttempt && !item.isCompleted
        if (reopened || !unchanged) clearInteraction()
        else setRetryError('Unable to restart this exercise. Please try again.')
        recoveryRef.current = null
        return reopened
      }
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
    if (!pendingTransition || isSaving || busyRef.current) return
    const fresh = queryClient.getQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId))
    moveToServerPosition(fresh?.currentItemIndex ?? pendingTransition.currentItemIndex, fresh?.items[fresh.currentItemIndex]?.currentStep ?? pendingTransition.nextStep)
  }, [isSaving, moveToServerPosition, pendingTransition, queryClient, sessionId])

  const durationForCurrentStep = () => {
    const now = Date.now()
    const startedAt = stepStartedAtRef.current
    stepStartedAtRef.current = now
    return startedAt === null ? 0 : Math.max(0, now - startedAt)
  }

  const handleAnswerResult = useCallback((result: practiceApi.SubmitPracticeAnswerResult, wasSkip: boolean) => {
    const requestId = requestRef.current?.id ?? ''
    requestRef.current = null
    queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), (current) => (current ? {
      ...current,
      currentItemIndex: result.currentItemIndex,
      status: result.status,
      items: current.items.map((item, index) => ({
        ...item,
        ...(item.itemId === result.itemId ? {
          attemptCount: (item.attemptCount ?? 0) + 1,
          lastAttempt: { requestId, step: result.step, correctness: result.correctness, isSkip: wasSkip, attemptNumber: null, assessment: null },
        } : {}),
        ...(index === result.currentItemIndex && result.nextStep ? { currentStep: result.nextStep } : {}),
      })),
    } : current))
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
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      clearRecordedAudio()
      const nextUrl = URL.createObjectURL(audio)
      recordedAudioUrlRef.current = nextUrl
      setRecordedAudioUrl(nextUrl)
    }
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
      queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), (current) => (current ? {
        ...current,
        items: current.items.map((item) => (item.itemId === currentItem.itemId ? { ...item, pronunciationAttemptCount: result.attemptNumber } : item)),
      } : current))
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, requestId })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, clearRecordedAudio, currentItem, handleAnswerResult, pronunciationMutation, queryClient, recoverProgress, session, sessionId])

  const beginRecording = useCallback(async () => {
    if (startingRecordingRef.current || recordingRef.current || !recordingSupported || !mountedRef.current) return
    startingRecordingRef.current = true
    setIsStartingRecording(true)
    setPronunciationError(null)
    setPronunciationFeedback(null)
    setFeedback(null)
    clearRecordedAudio()
    try {
      const recording = await startPcmRecording(handlePronunciationAudio)
      const latest = currentSessionRef.current
      if (!mountedRef.current || latest?.status !== 'active'
        || latest.items[latest.currentItemIndex]?.itemId !== currentItem?.itemId
        || latest.items[latest.currentItemIndex]?.currentStep !== 'pronunciation') {
        await recording.cancel()
        return
      }
      recordingRef.current = recording
      setIsRecording(true)
    } catch {
      if (mountedRef.current) setPronunciationError('Microphone access is unavailable. Check browser permission and try again.')
    } finally {
      startingRecordingRef.current = false
      if (mountedRef.current) setIsStartingRecording(false)
    }
  }, [clearRecordedAudio, currentItem, handlePronunciationAudio, recordingSupported])

  const startRecording = useCallback(async () => {
    if (isSaving || pendingTransition || isRecording || busyRef.current) return
    await beginRecording()
  }, [beginRecording, isRecording, isSaving, pendingTransition])

  const retryCurrentStep = useCallback(async () => {
    if (!currentItem || !activeStep || activeStep === 'recap' || isSaving || busyRef.current) return
    if (activeStep === 'pronunciation' && feedback === 'wrong' && !pendingTransition) {
      await startRecording()
      return
    }
    if (!pendingTransition || feedback !== 'correct' || !currentItem.lastAttempt?.requestId) return
    busyRef.current = true
    setRetryError(null)
    let reopened: boolean
    try {
      const result = await retryMutation.mutateAsync({
        sessionId,
        itemId: currentItem.itemId,
        step: activeStep,
        attemptId: currentItem.lastAttempt.requestId,
      })
      if (!mountedRef.current) return
      queryClient.setQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId), (current) => (current ? {
        ...current,
        items: current.items.map((item) => (item.itemId === result.itemId ? { ...item, currentStep: result.step } : item)),
      } : current))
      suppressAutoSpeechRef.current = activeStep === 'pronunciation'
      clearInteraction()
      reopened = true
    } catch {
      suppressAutoSpeechRef.current = activeStep === 'pronunciation'
      reopened = await recoverProgress({ item: currentItem, step: activeStep, retry: true })
      if (!reopened) suppressAutoSpeechRef.current = false
    } finally {
      busyRef.current = false
    }
    if (reopened && activeStep === 'pronunciation') {
      currentSessionRef.current = queryClient.getQueryData<practiceApi.PracticeSession>(practiceKeys.session(sessionId)) ?? null
      await beginRecording()
    }
  }, [activeStep, beginRecording, clearInteraction, currentItem, feedback, isSaving, pendingTransition, queryClient, recoverProgress, retryMutation, sessionId, startRecording])

  const stopRecording = useCallback(() => {
    void recordingRef.current?.stop()
  }, [])

  const playMyVoice = useCallback(() => {
    const url = recordedAudioUrlRef.current
    if (!url || isRecording || typeof Audio === 'undefined') return
    if (myVoiceAudioRef.current) {
      myVoiceAudioRef.current.pause()
    }
    const player = new Audio(url)
    myVoiceAudioRef.current = player
    void player.play().catch(() => undefined)
  }, [isRecording])

  const handleSelectRecapLevel = useCallback((level: PracticeReviewLevel) => {
    if (!currentItem || currentItem.alreadyInReview || currentReviewStatus === 'added' || isSaving || busyRef.current) return
    reviewLevelMutation.reset()
    setSelectedLevel(level)
  }, [currentItem, currentReviewStatus, isSaving, reviewLevelMutation])

  const submitReviewLevel = useCallback(async (level: PracticeReviewLevel) => {
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
      if (result.itemCompleted) {
        moveToServerPosition(
          result.currentItemIndex,
          session.items[result.currentItemIndex]?.currentStep ?? (result.currentItemIndex < session.items.length ? 'dictation' : null),
        )
      }
    } catch {
      await recoverProgress({ item: currentItem, step: activeStep, recap: true })
    } finally {
      busyRef.current = false
    }
  }, [activeStep, currentItem, isSaving, moveToServerPosition, recoverProgress, reviewLevelMutation, session])

  const confirmRecapNext = useCallback(async () => {
    if (!session || !currentItem || activeStep !== 'recap' || isSaving || busyRef.current) return
    if (currentReviewStatus === 'alreadyInReview' || currentItem.alreadyInReview) {
      await skipCurrentStep()
      return
    }
    const levelToSave = selectedLevel ?? currentItem.selectedLevel
    if (levelToSave != null) {
      await submitReviewLevel(levelToSave)
    }
  }, [activeStep, currentItem, currentReviewStatus, isSaving, selectedLevel, session, skipCurrentStep, submitReviewLevel])

  useEffect(() => {
    if (!currentWord || !activeStep || pendingTransition || activeStep === 'wordToMeaning' || activeStep === 'recap') return
    if (suppressAutoSpeechRef.current) {
      suppressAutoSpeechRef.current = false
      return
    }
    speakWord(currentWord, language)
  }, [activeStep, currentWord, language, pendingTransition])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void recordingRef.current?.cancel()
      clearRecordedAudio()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [clearRecordedAudio])

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

      if (event.defaultPrevented || target?.closest('[data-pronunciation-feedback]')) return
      if (event.key === 'Tab' && activeStep === 'pronunciation' && pronunciationFeedback) return

      if (event.key === 'Tab' && activeStep !== 'wordToMeaning' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        speakWord(word, language)
        return
      }

      if (event.key === 'Enter') {
        if (activeStep === 'recap' && !target?.closest('button')) {
          event.preventDefault()
          void confirmRecapNext()
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

      if ((event.key === 'p' || event.key === 'P') && activeStep === 'pronunciation' && !isTextEntry && !isRecording && recordedAudioUrl && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        playMyVoice()
        return
      }

      if ((event.key === 'r' || event.key === 'R') && activeStep === 'pronunciation' && !isTextEntry && !isRecording && !isSaving && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        if (pendingTransition && feedback === 'correct') {
          void retryCurrentStep()
        } else if (!pendingTransition) {
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && activeStep === 'pronunciation' && isRecording) {
        event.preventDefault()
        stopRecording()
        return
      }

      if (activeStep === 'recap' && /^[0-5]$/.test(event.key) && !isTextEntry && !isSaving && !currentItem.alreadyInReview && currentReviewStatus !== 'added' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        handleSelectRecapLevel(Number(event.key) as PracticeReviewLevel)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeStep, completeTransition, confirmRecapNext, currentItem, currentReviewStatus, feedback, handleSelectRecapLevel, isRecording, isSaving, language, pendingTransition, playMyVoice, pronunciationFeedback, recordedAudioUrl, retryCurrentStep, selectMeaning, skipCurrentStep, startRecording, stopRecording, submitTypedAnswer, typedAnswer])

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
        <PracticeProgress
          currentIndex={activeIndex}
          totalCards={session.items.length}
          step={activeStep}
          onExit={() => navigate('/practice')}
        />

        <article className={`practice-figma-session__card practice-figma-session__card--${activeStep}`} data-testid="active-practice-card">
          {activeStep === 'recap' ? (
            <PracticeRecap
              item={currentItem}
              isLastItem={isLastItem}
              reviewStatus={currentReviewStatus}
              isSaving={isSaving}
              saveError={answerMutation.isError || reviewLevelMutation.isError || completeMutation.isError}
              selectedLevel={selectedLevel}
              onPlayAudio={() => speakWord(currentItem.word, language)}
              onSelectLevel={handleSelectRecapLevel}
              onConfirmNext={() => void confirmRecapNext()}
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
              hasRecordedAudio={Boolean(recordedAudioUrl)}
              pronunciationError={pronunciationError}
              onPlayAudio={() => speakWord(currentItem.word, language)}
              onPlayMyVoice={playMyVoice}
              onAnswerChange={setTypedAnswer}
              onSubmit={() => void submitTypedAnswer()}
              onSelectSlot={(slotId) => void selectMeaning(slotId)}
              onSkip={() => void skipCurrentStep()}
              onContinue={completeTransition}
              onRetry={() => void retryCurrentStep()}
              onStartRecording={() => void startRecording()}
              onStopRecording={stopRecording}
            />
          )}
        </article>

        <p className="practice-figma-session__shortcuts" aria-label="Keyboard shortcuts">
          {pendingTransition ? (
            <>Shortcuts: <kbd>[Enter]</kbd> {pendingTransitionLabel}</>
          ) : activeStep === 'dictation' ? (
            <>Shortcuts: <kbd>[Tab]</kbd> Play Audio <span aria-hidden="true">•</span> <kbd>[Enter]</kbd> Check Answer <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip</>
          ) : activeStep === 'wordToMeaning' ? (
            <>Shortcuts: <kbd>[1]–[4]</kbd> Select Answer <span aria-hidden="true">•</span> <kbd>[Enter]</kbd> Continue <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip</>
          ) : activeStep === 'pronunciation' ? (
            isRecording ? (
              <>Shortcuts: <kbd>[Space]</kbd> Stop and Check <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip</>
            ) : (
              <>Shortcuts: <kbd>[Tab]</kbd> Listen <span aria-hidden="true">•</span> <kbd>[R]</kbd> Record <span aria-hidden="true">•</span> <kbd>[P]</kbd> My Voice <span aria-hidden="true">•</span> <kbd>[Enter]</kbd> Continue <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip</>
            )
          ) : (
            <>Shortcuts: <kbd>[0]–[5]</kbd> Choose Level <span aria-hidden="true">•</span> <kbd>[Tab]</kbd> Listen <span aria-hidden="true">•</span> <kbd>[Enter]</kbd> {isLastItem ? 'Finish Practice' : 'Next Word'} <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip</>
          )}
        </p>
      </section>

      {answerMutation.isError && activeStep !== 'recap' ? <p className="mx-auto mt-3 w-full max-w-[880px] text-sm text-destructive" role="alert">Unable to save your answer. Try again.</p> : null}
      {isRecovering ? <p className="mx-auto mt-3 w-full max-w-[880px] text-sm text-muted-foreground" role="status">Checking saved practice progress…</p> : null}
      {retryError ? <p role="alert" className="mx-auto mt-3 w-full max-w-[880px] text-sm text-destructive">{retryError}</p> : null}
      {connectionError ? <div className="mx-auto mt-3 flex w-full max-w-[880px] items-center gap-3 text-sm text-destructive" role="alert"><p className="m-0">{connectionError}</p><button className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground" type="button" disabled={isRecovering} onClick={() => { if (recoveryRef.current) void recoverProgress(recoveryRef.current) }}>Retry connection</button></div> : null}
      {completeMutation.isError ? <p className="mx-auto mt-3 w-full max-w-[880px] text-sm text-destructive" role="alert">Unable to finish the practice session. Try again.</p> : null}
      {completeMutation.isPending ? <p className="mx-auto mt-3 w-full max-w-[880px] text-sm text-muted-foreground" role="status">Saving practice results…</p> : null}
    </>
  )
}
