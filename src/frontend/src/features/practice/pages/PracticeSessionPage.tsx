import { Mic, Square, TriangleAlert, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import { getPageSession, type FlashcardCard } from '@/features/flashcards'
import { getPracticeSettings } from '../api/practice.api'
import { assessPronunciation, getPronunciationAssessmentErrorMessage, PronunciationFeedback, ShortcutGuide, startPcmRecording, supportsPcmRecording, type ActivePcmRecording, type PronunciationAssessment } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'


type PracticeOutcome = 'correct' | 'wrong'
type PracticeOrderType = 'sequential' | 'shuffle'
type PracticeReviewStatus = 'added' | 'alreadyInReview'

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase()
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

  const sessionQuery = useQuery({ queryKey: ['flashcard', 'page-session', pageId], queryFn: () => getPageSession(pageId), enabled: Boolean(pageId) })
  const practiceSettingsQuery = useQuery({ queryKey: ['practice', 'settings'], queryFn: getPracticeSettings })
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
          <div className="review-progress">
            <div className="review-progress-header">
              <span className="review-progress-order">{orderType === 'shuffle' ? 'Shuffle' : 'Sequential'}</span>
              <strong className="review-progress-count">{currentIndex + 1} of {sessionCards.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={sessionCards.length} />
          </div>

          <article className={`review-card review-card--${currentSurfaceMode} ${usesLargeSessionLayout ? 'learning-card--focused' : ''}`} data-testid="active-practice-card">
            {currentStep === 'recap' ? (
              <div className="review-recap practice-recap" data-testid="practice-answer-reveal">
                <header className="review-recap__header">
                  <h2>
                    {currentCard.word}
                    {hasText(currentCard.wordClass) ? <span> ({formatWordClass(currentCard.wordClass)})</span> : null}
                  </h2>
                  {hasText(currentCard.ipaPronunciation) ? <p>{formatIpa(currentCard.ipaPronunciation)}</p> : null}
                </header>

                {hasText(currentCard.meaningEn) || hasText(currentCard.meaningVn) || hasText(currentCard.example) || hasText(currentCard.synonyms) || hasText(currentCard.antonyms) ? (
                  <div className="review-recap__details practice-recap__details">
                    {hasText(currentCard.meaningEn) ? <p><strong><em>Definition:</em></strong> {currentCard.meaningEn}</p> : null}
                    {hasText(currentCard.meaningVn) ? <p><strong><em>Meaning:</em></strong> {currentCard.meaningVn}</p> : null}
                    {hasText(currentCard.example) ? <p><strong><em>Example:</em></strong> {currentCard.example}</p> : null}
                    {hasText(currentCard.synonyms) ? <p><strong><em>Synonyms:</em></strong> {currentCard.synonyms}</p> : null}
                    {hasText(currentCard.antonyms) ? <p><strong><em>Antonyms:</em></strong> {currentCard.antonyms}</p> : null}
                  </div>
                ) : null}

                <div className="practice-recap-actions">
                  <button className="practice-recap__nav-button" type="button" onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}>Previous</button>
                  {currentReviewStatus === 'alreadyInReview' ? <button className="practice-recap__add-button" type="button" disabled>Already in Review</button>
                    : currentReviewStatus === 'added' ? <button className="practice-recap__add-button" type="button" disabled>Added</button>
                      : <button className="practice-recap__add-button" type="button" onClick={() => void addCurrentWordToReview()} disabled={addToReviewMutation.isPending}>Add to Review</button>}
                  {currentIndex + 1 >= sessionCards.length ? (
                    <button className="practice-recap__finish-button" type="button" onClick={() => void finishPractice()} disabled={saveSummaryMutation.isPending} data-testid="practice-next-card">Finish</button>
                  ) : (
                    <button className="practice-recap__nav-button" type="button" onClick={() => advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')} data-testid="practice-next-card">Next</button>
                  )}
                </div>
                {addToReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to add this word to Review. Try again.</p> : null}
                {saveSummaryMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to save this practice result. Try again.</p> : null}
              </div>
            ) : (
              <div className="review-exercise">
                <h2 className="review-exercise__prompt">
                  {currentStep === 'dictation'
                    ? 'Listen carefully, then type the word you hear'
                    : currentStep === 'meaningToWord'
                      ? 'What word matches this meaning?'
                      : 'Say the word naturally'}
                </h2>

                {currentStep === 'dictation' ? (
                  <div className="review-exercise__stage review-exercise__stage--dictation">
                    <div className="practice-dictation-audio-control">
                      <button className="review-audio-action" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" onClick={() => speakWord(currentCard.word, language)}>
                        <Volume2 size={28} />
                      </button>
                      <span>Play</span>
                    </div>
                  </div>
                ) : currentStep === 'meaningToWord' ? (
                  <div className="review-exercise__stage review-meaning-card">
                    {hasText(currentCard.meaningVn) ? <strong>{currentCard.meaningVn}</strong> : null}
                    {hasText(currentCard.meaningEn) ? <p>{currentCard.meaningEn}</p> : null}
                  </div>
                ) : (
                  <div className="review-exercise__stage review-pronunciation-stage">
                    <div className="review-pronunciation-target">
                      <strong>{currentCard.word}</strong>
                      {hasText(currentCard.ipaPronunciation) ? <span>{formatIpa(currentCard.ipaPronunciation)}</span> : null}
                    </div>
                    <PronunciationFeedback assessment={pronunciationFeedback} />
                    {!recordingSupported ? <p className="practice-mode-warning"><TriangleAlert size={16} /> Microphone recording is unavailable in this browser.</p> : null}
                    <div className="review-pronunciation-controls">
                      <button className="review-pronunciation-play-button" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" title="Play audio (Tab)" onClick={() => speakWord(currentCard.word, language)}>
                        <Volume2 size={20} />
                      </button>
                      <button className={`review-record-button ${isRecording ? 'review-record-button--active' : ''}`} type="button" aria-label="Start recording" aria-keyshortcuts="R" title="Record (R)" onClick={() => void startRecording()} disabled={isRecording || pronunciationMutation.isPending || !recordingSupported}>
                        <Mic size={22} />
                      </button>
                      <button className="review-stop-button" type="button" aria-label="Stop recording" aria-keyshortcuts="Space" title="Stop (Space)" onClick={() => void recordingRef.current?.stop()} disabled={!isRecording}>
                        <Square size={18} fill="currentColor" />
                      </button>
                    </div>
                    {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}
                  </div>
                )}

                {currentStep !== 'pronunciation' ? (
                  <div className="review-answer-form">
                    {currentStep === 'meaningToWord' || null}
                    <input
                      id="practice-answer-input"
                      value={typedAnswer}
                      onChange={(event) => setTypedAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && normalizeAnswer(typedAnswer).length > 0) {
                          event.preventDefault()
                          event.stopPropagation()
                          submitTypedAnswer()
                        }
                      }}
                      data-testid="practice-answer-input"
                      placeholder={currentStep === 'meaningToWord' ? 'Type the word...' : 'Type your answer...'}
                      disabled={Boolean(resolvedOutcome)}
                    />
                    {feedback === 'wrong' ? <p className="practice-wrong-message" role="status" aria-live="polite">Wrong, please try again</p> : null}
                    <div className="review-exercise__actions">
                      <button className={usesLargeAnswerLayout ? 'practice-dictation-submit' : 'review-skip-button review-submit-button'} type="button" title="Submit answer (Enter)" onClick={submitTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0 || Boolean(resolvedOutcome)}>
                        {isDictationStep ? 'Submit Answer' : 'Submit'}
                      </button>
                      {!resolvedOutcome ? <button className={usesLargeAnswerLayout ? 'practice-dictation-skip' : 'review-skip-button'} type="button" onClick={revealAndSkip}>Skip</button> : null}
                      {resolvedOutcome ? <button className="primary-button review-submit-button" type="button" onClick={continueResolvedStep}>Continue</button> : null}
                    </div>
                  </div>
                ) : (
                  <div className="review-exercise__actions">
                    {feedback === 'wrong' ? <p className="practice-wrong-message" role="status" aria-live="polite">Wrong</p> : null}
                    {!resolvedOutcome ? <button className="practice-dictation-skip" type="button" onClick={revealAndSkip}>Skip</button> : null}
                    {resolvedOutcome ? <button className="practice-dictation-submit" type="button" onClick={continueResolvedStep}>Continue</button> : null}
                  </div>
                )}
              </div>
            )}
          </article>
          <ShortcutGuide mode={currentStep} />
        </section>
      ) : null}
    </>
  )
}
