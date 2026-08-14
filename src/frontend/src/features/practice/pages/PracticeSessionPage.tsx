import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import { flashcardKeys, getPageSession, type FlashcardCard } from '@/features/flashcards'
import { getPracticeSettings } from '../api/practice.api'
import { practiceKeys } from '../api/practice.queries'
import { assessPronunciation, getPronunciationAssessmentErrorMessage, ShortcutGuide, startPcmRecording, supportsPcmRecording, type ActivePcmRecording, type PronunciationAssessment } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { PracticeModeSurface } from '../components/session/PracticeModeSurface'
import { PracticeProgress } from '../components/session/PracticeProgress'
import { PracticeRecap } from '../components/session/PracticeRecap'


type PracticeOutcome = 'correct' | 'wrong'
type PracticeOrderType = 'sequential' | 'shuffle'
type PracticeReviewStatus = 'added' | 'alreadyInReview'

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase()
}

function speakWord(word: string, language: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function shuffleCards(cards: FlashcardCard[]) {
  return [...cards].sort(() => Math.random() - 0.5)
}

export function PracticeSessionPage() {
  const { pageId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderType: PracticeOrderType = searchParams.get('order') === 'shuffle' ? 'shuffle' : 'sequential'
  const [sessionStarted, setSessionStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [feedback, setFeedback] = useState<PracticeOutcome | null>(null)
  const [resolvedOutcome, setResolvedOutcome] = useState<PracticeOutcome | null>(null)
  const [wordHasMistake, setWordHasMistake] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [pronunciationError, setPronunciationError] = useState<string | null>(null)
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationAssessment | null>(null)
  const [correctWords, setCorrectWords] = useState(0)
  const [wrongWords, setWrongWords] = useState(0)
  const [sessionCards, setSessionCards] = useState<FlashcardCard[]>([])
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, PracticeReviewStatus>>({})
  const recordingRef = useRef<ActivePcmRecording | null>(null)
  const initializedSessionKeyRef = useRef<string | null>(null)

  const sessionQuery = useQuery({ queryKey: flashcardKeys.pageSession(pageId), queryFn: () => getPageSession(pageId), enabled: Boolean(pageId) })
  const practiceSettingsQuery = useQuery({ queryKey: practiceKeys.settings, queryFn: getPracticeSettings })
  const saveSummaryMutation = useMutation({ mutationFn: practiceApi.createPracticeSessionSummary })
  const addToReviewMutation = useMutation({ mutationFn: practiceApi.addPracticeWordsToReview })
  const pronunciationMutation = useMutation({ mutationFn: ({ wordId, audio }: { wordId: string; audio: Blob }) => assessPronunciation(wordId, audio) })

  const currentCard = sessionCards[currentIndex] ?? null
  const language = sessionQuery.data?.boardLanguage ?? 'en'
  const modeSequence = useMemo(() => [...(practiceSettingsQuery.data?.modeSequence ?? []), 'recap' as const], [practiceSettingsQuery.data?.modeSequence])
  const currentStep = modeSequence[currentStepIndex] ?? 'recap'
  const recapMode = modeSequence[Math.max(0, currentStepIndex - 1)] ?? 'dictation'
  const currentSurfaceMode = currentStep === 'recap' ? recapMode : currentStep
  const isDictationStep = currentStep === 'dictation'
  const usesLargeAnswerLayout = isDictationStep || currentStep === 'meaningToWord'
  const usesLargeSessionLayout = usesLargeAnswerLayout || currentStep === 'pronunciation' || currentStep === 'recap'
  const recordingSupported = supportsPcmRecording()

  useEffect(() => {
    if (!sessionStarted || !currentCard || resolvedOutcome || currentStep === 'meaningToWord' || currentStep === 'recap') return
    speakWord(currentCard.word, language)
  }, [currentCard, currentStep, language, resolvedOutcome, sessionStarted])

  useEffect(() => () => {
    void recordingRef.current?.cancel()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    const cards = sessionQuery.data?.words ?? []
    const sessionKey = `${pageId}:${orderType}`
    if (!sessionQuery.data || !practiceSettingsQuery.isSuccess || cards.length === 0 || initializedSessionKeyRef.current === sessionKey) return

    initializedSessionKeyRef.current = sessionKey
    const initialReviewStatuses = cards.reduce<Record<string, PracticeReviewStatus>>((state, card) => {
      if (card.isInReview) state[card.wordId] = 'alreadyInReview'
      return state
    }, {})

    setSessionCards(orderType === 'shuffle' ? shuffleCards(cards) : [...cards])
    setSessionStarted(true)
    setCurrentIndex(0)
    setCurrentStepIndex(0)
    setTypedAnswer('')
    setFeedback(null)
    setResolvedOutcome(null)
    setWordHasMistake(false)
    setPronunciationError(null)
    setPronunciationFeedback(null)
    setIsRecording(false)
    setCorrectWords(0)
    setWrongWords(0)
    setReviewStatuses(initialReviewStatuses)
    saveSummaryMutation.reset()
    addToReviewMutation.reset()
    pronunciationMutation.reset()
  }, [addToReviewMutation, orderType, pageId, practiceSettingsQuery.isSuccess, pronunciationMutation, saveSummaryMutation, sessionQuery.data])

  const resetStepState = useCallback(() => {
    setTypedAnswer('')
    setFeedback(null)
    setResolvedOutcome(null)
    setPronunciationError(null)
    setPronunciationFeedback(null)
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)
    pronunciationMutation.reset()
  }, [pronunciationMutation])

  const persistCompletion = useCallback(async (nextCorrectCards: number, nextWrongCards: number) => {
    if (!sessionQuery.data) return
    return saveSummaryMutation.mutateAsync({
      pageId: sessionQuery.data.pageId,
      mode: practiceSettingsQuery.data?.modeSequence[0] ?? 'dictation',
      totalCards: sessionCards.length,
      correctCards: nextCorrectCards,
      wrongCards: nextWrongCards,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }, [practiceSettingsQuery.data?.modeSequence, saveSummaryMutation, sessionCards.length, sessionQuery.data])

  const advanceAfterRecap = useCallback((outcome: PracticeOutcome) => {
    const nextCorrect = correctWords + (outcome === 'correct' ? 1 : 0)
    const nextWrong = wrongWords + (outcome === 'wrong' ? 1 : 0)
    setCorrectWords(nextCorrect)
    setWrongWords(nextWrong)
    if (currentIndex + 1 >= sessionCards.length) {
      setSessionStarted(false)
      return
    }

    setCurrentIndex((value) => value + 1)
    setCurrentStepIndex(0)
    setWordHasMistake(false)
    resetStepState()
  }, [correctWords, currentIndex, resetStepState, sessionCards.length, wrongWords])



  const resolveStep = useCallback((outcome: PracticeOutcome) => {
    setResolvedOutcome(outcome)
    setFeedback(outcome === 'wrong' ? 'wrong' : null)
    if (outcome === 'wrong') setWordHasMistake(true)
  }, [])

  const continueResolvedStep = useCallback(() => {
    setCurrentStepIndex((value) => value + 1)
    resetStepState()
  }, [resetStepState])

  const submitTypedAnswer = useCallback(() => {
    if (!currentCard || resolvedOutcome || currentStep === 'recap') return
    if (normalizeAnswer(typedAnswer) === normalizeAnswer(currentCard.word)) {
      continueResolvedStep()
      return
    }
    setFeedback('wrong')
    setWordHasMistake(true)
  }, [continueResolvedStep, currentCard, currentStep, resolvedOutcome, typedAnswer])

  const revealAndSkip = useCallback(() => {
    if (currentCard && !resolvedOutcome) resolveStep('wrong')
  }, [currentCard, resolveStep, resolvedOutcome])

  const handlePronunciationAudio = useCallback(async (audio: Blob) => {
    recordingRef.current = null
    setIsRecording(false)
    if (!currentCard) return

    try {
      const result = await pronunciationMutation.mutateAsync({ wordId: currentCard.wordId, audio })
      setPronunciationFeedback(result)
      if (result.correct) {
        continueResolvedStep()
        return
      }

      setFeedback('wrong')
      setWordHasMistake(true)
    } catch (error) {
      setPronunciationError(getPronunciationAssessmentErrorMessage(error))
    }
  }, [continueResolvedStep, currentCard, pronunciationMutation])

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

  async function addCurrentWordToReview() {
    if (!sessionQuery.data || !currentCard) return
    const result = await addToReviewMutation.mutateAsync({
      pageId: sessionQuery.data.pageId,
      wordId: currentCard.wordId,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    setReviewStatuses((current) => ({ ...current, [result.wordId]: result.status }))
  }

  const finishPractice = useCallback(async () => {
    const nextCorrect = correctWords + (wordHasMistake ? 0 : 1)
    const nextWrong = wrongWords + (wordHasMistake ? 1 : 0)
    setCorrectWords(nextCorrect)
    setWrongWords(nextWrong)
    try {
      await persistCompletion(nextCorrect, nextWrong)
      setSessionStarted(false)
      navigate('/practice')
    } catch {
      // The recap remains visible so the learner can retry saving the session.
    }
  }, [correctWords, navigate, persistCompletion, wordHasMistake, wrongWords])

  useEffect(() => {
    if (!sessionStarted || !currentCard) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab' && currentStep !== 'meaningToWord' && currentStep !== 'recap') {
        event.preventDefault()
        speakWord(currentCard.word, language)
        return
      }

      if (event.key === 'Enter') {
        if (currentStep === 'recap') {
          event.preventDefault()
          if (currentIndex + 1 >= sessionCards.length) {
            void finishPractice()
          } else {
            advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')
          }
          return
        }
        if (resolvedOutcome) {
          event.preventDefault()
          continueResolvedStep()
          return
        }
        if (currentStep !== 'pronunciation' && normalizeAnswer(typedAnswer).length > 0) {
          event.preventDefault()
          submitTypedAnswer()
        }
        return
      }

      if (event.key === 'Escape' && currentStep !== 'recap' && !resolvedOutcome) {
        event.preventDefault()
        revealAndSkip()
        return
      }

      if ((event.key === 'r' || event.key === 'R') && currentStep === 'pronunciation') {
        const target = event.target as HTMLElement | null
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
        if (!isInput && !isRecording && recordingSupported && !pronunciationMutation.isPending && !resolvedOutcome) {
          event.preventDefault()
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && currentStep === 'pronunciation' && isRecording) {
        event.preventDefault()
        void recordingRef.current?.stop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [advanceAfterRecap, continueResolvedStep, currentCard, currentIndex, currentStep, finishPractice, isRecording, language, pronunciationMutation.isPending, recordingSupported, revealAndSkip, resolvedOutcome, sessionCards.length, sessionStarted, startRecording, submitTypedAnswer, typedAnswer, wordHasMistake])

  const currentReviewStatus = currentCard ? (reviewStatuses[currentCard.wordId] ?? null) : null

  return (
    <>
      {sessionQuery.isLoading || practiceSettingsQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading practice session...</p> : null}
      {sessionQuery.isError || practiceSettingsQuery.isError ? <p role="alert" className="text-sm text-destructive">This practice session is unavailable.</p> : null}
      {sessionQuery.data && practiceSettingsQuery.isSuccess && sessionQuery.data.words.length === 0 ? <p role="status" className="text-sm text-muted-foreground">This page has no words to practice.</p> : null}

      {sessionStarted && currentCard ? (
        <section className={`review-session practice-session practice-session--${currentSurfaceMode} ${usesLargeSessionLayout ? 'learning-session--focused' : ''}`}>
          <PracticeProgress orderLabel={orderType === 'shuffle' ? 'Shuffle' : 'Sequential'} currentIndex={currentIndex} totalCards={sessionCards.length} />
          <article className={`review-card review-card--${currentSurfaceMode} ${usesLargeSessionLayout ? 'learning-card--focused' : ''}`} data-testid="active-practice-card">
            {currentStep === 'recap' ? (
              <PracticeRecap
                card={currentCard}
                reviewStatus={currentReviewStatus}
                isAddingToReview={addToReviewMutation.isPending}
                isSaving={saveSummaryMutation.isPending}
                addError={addToReviewMutation.isError}
                saveError={saveSummaryMutation.isError}
                isLastCard={currentIndex + 1 >= sessionCards.length}
                onPrevious={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                onAddToReview={() => void addCurrentWordToReview()}
                onNext={() => advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')}
                onFinish={() => void finishPractice()}
              />
            ) : (
              <PracticeModeSurface
                mode={currentStep}
                card={currentCard}
                typedAnswer={typedAnswer}
                feedback={feedback}
                isResolved={Boolean(resolvedOutcome)}
                usesLargeAnswerLayout={usesLargeAnswerLayout}
                pronunciationFeedback={pronunciationFeedback}
                recordingSupported={recordingSupported}
                isRecording={isRecording}
                isAssessmentPending={pronunciationMutation.isPending}
                pronunciationError={pronunciationError}
                onPlayAudio={() => speakWord(currentCard.word, language)}
                onAnswerChange={setTypedAnswer}
                onSubmit={submitTypedAnswer}
                onSkip={revealAndSkip}
                onContinue={continueResolvedStep}
                onStartRecording={() => void startRecording()}
                onStopRecording={() => void recordingRef.current?.stop()}
              />
            )}
          </article>
          <ShortcutGuide mode={currentStep} />
        </section>
      ) : null}
    </>
  )
}
