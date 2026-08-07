import { CheckCircle2, Mic, MicOff, PenSquare, RotateCcw, TriangleAlert, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import { getPageSession, type FlashcardCard } from '@/features/flashcards'
import { getPracticeSettings } from '../api/practice.api'
import { assessPronunciation, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
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
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [pronunciationRetryUsed, setPronunciationRetryUsed] = useState(false)
  const [pronunciationPairExhausted, setPronunciationPairExhausted] = useState(false)
  const [correctWords, setCorrectWords] = useState(0)
  const [wrongWords, setWrongWords] = useState(0)
  const [sessionCards, setSessionCards] = useState<FlashcardCard[]>([])
  const [completedSession, setCompletedSession] = useState<{ correctCards: number; wrongCards: number } | null>(null)
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
    if (!sessionStarted || !currentCard || completedSession) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        event.preventDefault()
        speakWord(currentCard.word, language)
        return
      }

      if (event.key === 'Enter') {
        if (currentStep === 'recap') {
          event.preventDefault()
          advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')
          return
        }
        if (resolvedOutcome) {
          event.preventDefault()
          continueResolvedStep()
          return
        }
        if (currentStep !== 'pronunciation') {
          if (normalizeAnswer(typedAnswer).length > 0) {
            event.preventDefault()
            submitTypedAnswer()
          }
        }
        return
      }

      if ((event.key === 'r' || event.key === 'R') && currentStep === 'pronunciation') {
        const target = event.target as HTMLElement | null
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
        if (!isInput && !isRecording && recordingSupported && !pronunciationMutation.isPending && !pronunciationPairExhausted && !resolvedOutcome) {
          event.preventDefault()
          void startRecording()
        }
        return
      }

      if ((event.key === ' ' || event.key === 'Space') && currentStep === 'pronunciation') {
        if (isRecording) {
          event.preventDefault()
          void recordingRef.current?.stop()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionStarted, currentCard, completedSession, currentStep, wordHasMistake, resolvedOutcome, typedAnswer, isRecording, recordingSupported, pronunciationMutation.isPending, pronunciationPairExhausted, language])

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
    setPronunciationAttempts(0)
    setPronunciationRetryUsed(false)
    setPronunciationPairExhausted(false)
    setIsRecording(false)
    setCorrectWords(0)
    setWrongWords(0)
    setCompletedSession(null)
    setReviewStatuses(initialReviewStatuses)
    saveSummaryMutation.reset()
    addToReviewMutation.reset()
    pronunciationMutation.reset()
  }, [addToReviewMutation, orderType, pageId, practiceSettingsQuery.isSuccess, pronunciationMutation, saveSummaryMutation, sessionQuery.data])

  function resetStepState() {
    setTypedAnswer('')
    setFeedback(null)
    setResolvedOutcome(null)
    setPronunciationError(null)
    setPronunciationAttempts(0)
    setPronunciationRetryUsed(false)
    setPronunciationPairExhausted(false)
    void recordingRef.current?.cancel()
    recordingRef.current = null
    setIsRecording(false)
    pronunciationMutation.reset()
  }

  async function persistCompletion(nextCorrectCards: number, nextWrongCards: number) {
    if (!sessionQuery.data) return
    return saveSummaryMutation.mutateAsync({
      pageId: sessionQuery.data.pageId,
      mode: practiceSettingsQuery.data?.modeSequence[0] ?? 'dictation',
      totalCards: sessionCards.length,
      correctCards: nextCorrectCards,
      wrongCards: nextWrongCards,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }

  function advanceAfterRecap(outcome: PracticeOutcome) {
    const nextCorrect = correctWords + (outcome === 'correct' ? 1 : 0)
    const nextWrong = wrongWords + (outcome === 'wrong' ? 1 : 0)
    setCorrectWords(nextCorrect)
    setWrongWords(nextWrong)
    if (currentIndex + 1 >= sessionCards.length) {
      setCompletedSession({ correctCards: nextCorrect, wrongCards: nextWrong })
      setSessionStarted(false)
      return
    }

    setCurrentIndex((value) => value + 1)
    setCurrentStepIndex(0)
    setWordHasMistake(false)
    resetStepState()
  }



  function resolveStep(outcome: PracticeOutcome) {
    setResolvedOutcome(outcome)
    setFeedback(outcome)
    if (outcome === 'wrong') setWordHasMistake(true)
  }

  function continueResolvedStep() {
    setCurrentStepIndex((value) => value + 1)
    resetStepState()
  }

  function submitTypedAnswer() {
    if (!currentCard || resolvedOutcome || currentStep === 'recap') return
    if (normalizeAnswer(typedAnswer) === normalizeAnswer(currentCard.word)) {
      resolveStep('correct')
      return
    }
    setFeedback('wrong')
    setWordHasMistake(true)
  }

  function revealAndSkip() {
    if (currentCard && !resolvedOutcome) resolveStep('wrong')
  }

  async function handlePronunciationAudio(audio: Blob) {
    recordingRef.current = null
    setIsRecording(false)
    if (!currentCard) return

    try {
      const result = await pronunciationMutation.mutateAsync({ wordId: currentCard.wordId, audio })
      const nextAttempt = pronunciationAttempts + 1
      setPronunciationAttempts(nextAttempt)
      if (result.correct) {
        resolveStep('correct')
        return
      }

      setFeedback('wrong')
      setWordHasMistake(true)
      if (nextAttempt >= 2) setPronunciationPairExhausted(true)
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

  function retryPronunciationPair() {
    setPronunciationRetryUsed(true)
    setPronunciationAttempts(0)
    setPronunciationPairExhausted(false)
    setFeedback(null)
    setPronunciationError(null)
    pronunciationMutation.reset()
  }

  async function addCurrentWordToReview() {
    if (!sessionQuery.data || !currentCard) return
    const result = await addToReviewMutation.mutateAsync({
      pageId: sessionQuery.data.pageId,
      wordId: currentCard.wordId,
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    setReviewStatuses((current) => ({ ...current, [result.wordId]: result.status }))
  }

  async function finalizePractice() {
    if (completedSession) await persistCompletion(completedSession.correctCards, completedSession.wrongCards)
  }

  const currentReviewStatus = currentCard ? (reviewStatuses[currentCard.wordId] ?? null) : null

  return (
    <>
      {sessionQuery.isLoading || practiceSettingsQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading practice session...</p> : null}
      {sessionQuery.isError || practiceSettingsQuery.isError ? <p role="alert" className="text-sm text-destructive">This practice session is unavailable.</p> : null}
      {sessionQuery.data && practiceSettingsQuery.isSuccess && sessionQuery.data.words.length === 0 ? <p role="status" className="text-sm text-muted-foreground">This page has no words to practice.</p> : null}

      {!sessionStarted && completedSession ? (
        <section className="review-summary practice-summary" data-testid="practice-summary">
          <div className="practice-summary-badge-icon">
            <CheckCircle2 size={40} />
          </div>
          <span className="preview-label">Practice complete</span>
          <h1>{sessionQuery.data?.pageName}</h1>
          <p>{correctWords} correct and {wrongWords} wrong across {sessionCards.length} practiced words.</p>
          <div className="practice-summary-stats-grid">
            <div className="practice-stat-card practice-stat-card--correct">
              <span className="practice-stat-value">{correctWords}</span>
              <span className="practice-stat-label">Correct</span>
            </div>
            <div className="practice-stat-card practice-stat-card--wrong">
              <span className="practice-stat-value">{wrongWords}</span>
              <span className="practice-stat-label">Wrong</span>
            </div>
          </div>
          {saveSummaryMutation.isSuccess ? <Link className="primary-button review-summary__done" to="/practice">Done</Link> : (
            <button className="primary-button review-summary__done" type="button" onClick={() => void finalizePractice()} disabled={saveSummaryMutation.isPending}>Finish</button>
          )}
          {saveSummaryMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to save this practice result. Try again.</p> : null}
        </section>
      ) : null}

      {sessionStarted && currentCard ? (
        <section className="review-session practice-session">
          <div className="review-progress">
            <div className="review-progress-header">
              <span className="review-progress-order">{orderType === 'shuffle' ? 'Shuffle' : 'Sequential'}</span>
              <strong className="review-progress-count">{currentIndex + 1} / {sessionCards.length}</strong>
              <span className="review-progress-spacer" aria-hidden="true" />
            </div>
            <progress value={currentIndex + 1} max={sessionCards.length} />
          </div>

          <article className={`review-card review-card--soft review-card--${currentStep}`} data-testid="active-practice-card">
            {currentStep === 'dictation' ? (
              <div className="practice-dictation-hero">
                <h2>Listen, then type the exact word</h2>
                <div className="practice-audio-trigger-hub">
                  <button
                    className="practice-audio-hero-button"
                    type="button"
                    aria-label="Replay word audio"
                    title="Replay audio (Tab)"
                    onClick={() => speakWord(currentCard.word, language)}
                  >
                    <Volume2 size={28} />
                  </button>
                  <div className="practice-soundwave" aria-hidden="true">
                    <span /><span /><span /><span /><span />
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 'meaningToWord' ? (
              <div className="practice-meaning-hero">
                <div className="practice-meaning-box">
                  {currentCard.meaningVn ? (
                    <h2 className="practice-meaning-vn">{currentCard.meaningVn}</h2>
                  ) : null}
                  {currentCard.meaningEn ? (
                    <p className="practice-meaning-en">{currentCard.meaningEn}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === 'pronunciation' ? (
              <div className="practice-pronunciation-hero">
                <h2>Listen, then record your pronunciation</h2>
                <div className="practice-attempt-trackers">
                  <span className={`practice-attempt-dot ${pronunciationAttempts >= 0 ? 'practice-attempt-dot--active' : ''}`} />
                  <span className={`practice-attempt-dot ${pronunciationAttempts >= 1 ? 'practice-attempt-dot--active' : ''}`} />
                  <span className="practice-attempt-copy">Attempt {Math.min(pronunciationAttempts + 1, 2)} of 2{pronunciationRetryUsed ? ' · retry pair' : ''}</span>
                </div>
                {!recordingSupported ? <p className="practice-mode-warning"><TriangleAlert size={16} /> Microphone recording is unavailable in this browser.</p> : null}
                <div className="practice-pronunciation-controls">
                  <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" title="Replay audio (Tab)" onClick={() => speakWord(currentCard.word, language)}><Volume2 size={20} /></button>
                  <button
                    className={`secondary-button ${isRecording ? 'practice-mic-studio-btn--recording' : ''}`}
                    type="button"
                    title="Record (R)"
                    onClick={() => void startRecording()}
                    disabled={isRecording || pronunciationMutation.isPending || pronunciationPairExhausted || !recordingSupported}
                  >
                    <Mic size={16} /> Record
                  </button>
                  <button className="secondary-button" type="button" title="Stop (Space)" onClick={() => void recordingRef.current?.stop()} disabled={!isRecording}>
                    <MicOff size={16} /> Stop
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 'recap' ? (
              <div className="learning-recap" data-testid="practice-answer-reveal">
                <div className={`answer-feedback-banner answer-feedback-banner--${wordHasMistake ? 'wrong' : 'correct'}`} role="status">
                  {wordHasMistake ? '✕ Wrong' : '✓ Correct'}
                </div>
                <div className="learning-recap__word">
                  <h2>{currentCard.word} <span>({formatWordClass(currentCard.wordClass)})</span></h2>
                  <button className="icon-button" type="button" aria-label="Replay word audio" title="Replay audio (Tab)" onClick={() => speakWord(currentCard.word, language)}><Volume2 size={18} /></button>
                </div>
                <p className="learning-recap__ipa">{formatIpa(currentCard.ipaPronunciation)}</p>
                <div className="learning-recap-details-card">
                  {currentCard.meaningEn ? (
                    <div className="learning-recap-detail-item">
                      <span className="learning-recap-detail-label">Definition</span>
                      <span className="learning-recap-detail-value">{currentCard.meaningEn}</span>
                    </div>
                  ) : null}
                  {currentCard.meaningVn ? (
                    <div className="learning-recap-detail-item">
                      <span className="learning-recap-detail-label">Meaning (VN)</span>
                      <span className="learning-recap-detail-value">{currentCard.meaningVn}</span>
                    </div>
                  ) : null}
                  {currentCard.example ? (
                    <div className="learning-recap-example-quote">
                      <span className="learning-recap-detail-label">Example</span>
                      <p className="m-0">{currentCard.example}</p>
                    </div>
                  ) : null}
                </div>
                <div className="deck-actions learning-recap__actions">
                  <button className="secondary-button" type="button" onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}>Previous</button>
                  {currentReviewStatus === 'alreadyInReview' ? <button className="secondary-button" type="button" disabled>Already in Review</button>
                    : currentReviewStatus === 'added' ? <button className="secondary-button" type="button" disabled>Added</button>
                      : <button className="secondary-button" type="button" onClick={() => void addCurrentWordToReview()} disabled={addToReviewMutation.isPending}>Add to Review</button>}
                  <button className="primary-button" type="button" onClick={() => advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')} data-testid="practice-next-card">{currentIndex + 1 >= sessionCards.length ? 'Finish practice' : 'Next'}</button>
                </div>
                {addToReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to add this word to Review. Try again.</p> : null}
              </div>
            ) : (
              <div className="practice-answer-panel">
                {currentStep !== 'pronunciation' && !resolvedOutcome ? (
                  <div className="practice-input-group">
                    <label className="practice-label" htmlFor="practice-answer-input">Type the target word</label>
                    <input
                      id="practice-answer-input"
                      className="practice-input"
                      value={typedAnswer}
                      onChange={(event) => setTypedAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && normalizeAnswer(typedAnswer).length > 0) {
                          event.preventDefault()
                          submitTypedAnswer()
                        }
                      }}
                      data-testid="practice-answer-input"
                      placeholder="Type your answer here..."
                    />
                    <div className="practice-actions-stacked">
                      <button className="primary-button practice-btn-submit" type="button" title="Submit answer (Enter)" onClick={submitTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0}>
                        <PenSquare size={16} /> Submit answer
                      </button>
                      <button className="secondary-button practice-btn-skip" type="button" onClick={revealAndSkip}>
                        Reveal / skip
                      </button>
                    </div>
                  </div>
                ) : null}

                {feedback ? (
                  <div className={`answer-feedback-banner answer-feedback-banner--${feedback}`} role="status">
                    {feedback === 'correct' ? '✓ Correct' : '✕ Wrong'}
                  </div>
                ) : null}

                {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}

                {pronunciationPairExhausted && !resolvedOutcome ? (
                  <div className="deck-actions">
                    {!pronunciationRetryUsed ? <button className="secondary-button" type="button" onClick={retryPronunciationPair}><RotateCcw size={16} /> Retry · 2 more attempts</button> : null}
                    <button className="primary-button practice-btn-submit" type="button" onClick={revealAndSkip}>Skip</button>
                  </div>
                ) : null}

                {resolvedOutcome ? (
                  <button className="primary-button practice-btn-submit" type="button" onClick={continueResolvedStep}>
                    Continue
                  </button>
                ) : null}
              </div>
            )}
          </article>
        </section>
      ) : null}
    </>
  )
}
