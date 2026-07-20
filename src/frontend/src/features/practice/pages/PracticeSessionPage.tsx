import { CheckCircle2, Mic, MicOff, PenSquare, RotateCcw, TriangleAlert, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import * as practiceApi from '../api/practice.api'
import { getPageSession, type FlashcardCard } from '@/features/flashcards'
import { getPracticeSettings } from '../api/practice.api'
import { assessPronunciation, startPcmRecording, supportsPcmRecording, type ActivePcmRecording } from '@/features/pronunciation'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { Button } from '@/shared/components/ui/button'

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
  }

  function revealAndSkip() {
    if (currentCard) resolveStep('wrong')
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
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline" size="sm"><Link to="/practice">Back to decks</Link></Button>
      </div>
      {sessionQuery.isLoading || practiceSettingsQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading practice session...</p> : null}
      {sessionQuery.isError || practiceSettingsQuery.isError ? <p role="alert" className="text-sm text-destructive">This practice session is unavailable.</p> : null}
      {sessionQuery.data && practiceSettingsQuery.isSuccess && sessionQuery.data.words.length === 0 ? <p role="status" className="text-sm text-muted-foreground">This page has no words to practice.</p> : null}

      {!sessionStarted && completedSession ? (
        <section className="review-summary practice-summary" data-testid="practice-summary">
          <CheckCircle2 size={38} />
          <span className="preview-label">Practice complete</span>
          <h1>{sessionQuery.data?.pageName}</h1>
          <p>{correctWords} correct and {wrongWords} wrong across {sessionCards.length} practiced words.</p>
          {saveSummaryMutation.isSuccess ? <Link className="primary-button review-summary__done" to="/practice">Done</Link> : (
            <button className="primary-button review-summary__done" type="button" onClick={() => void finalizePractice()} disabled={saveSummaryMutation.isPending}>Finish</button>
          )}
          {saveSummaryMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to save this practice result. Try again.</p> : null}
        </section>
      ) : null}

      {sessionStarted && currentCard ? (
        <section className="review-session practice-session">
          <div className="review-progress">
            <div>
              <span className="preview-label">{currentStep === 'meaningToWord' ? 'Meaning → Word' : currentStep} · {orderType}</span>
              <strong>{currentIndex + 1} / {sessionCards.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={sessionCards.length} />
          </div>

          <article className="review-card review-card--soft" data-testid="active-practice-card">
            {currentStep === 'dictation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Dictation</span>
                <h2>Listen, then type the exact word</h2>
                <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}><Volume2 size={18} /></button>
              </div>
            ) : null}

            {currentStep === 'meaningToWord' ? (
              <div className="practice-prompt">
                <span className="preview-label">Meaning → Word</span>
                <h2>Type the target word</h2>
                <p>{currentCard.meaningVn}</p>
                <p>{currentCard.meaningEn}</p>
              </div>
            ) : null}

            {currentStep === 'pronunciation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Pronunciation</span>
                <h2>Listen, then record your pronunciation</h2>
                <p className="practice-attempt-copy">Attempt {Math.min(pronunciationAttempts + 1, 2)} of 2{pronunciationRetryUsed ? ' · retry pair' : ''}</p>
                {!recordingSupported ? <p className="practice-mode-warning"><TriangleAlert size={16} /> Microphone recording is unavailable in this browser.</p> : null}
                <div className="practice-pronunciation-controls">
                  <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}><Volume2 size={18} /></button>
                  <button className="secondary-button" type="button" onClick={() => void startRecording()} disabled={isRecording || pronunciationMutation.isPending || pronunciationPairExhausted || !recordingSupported}><Mic size={16} /> Record</button>
                  <button className="secondary-button" type="button" onClick={() => void recordingRef.current?.stop()} disabled={!isRecording}><MicOff size={16} /> Stop</button>
                </div>
              </div>
            ) : null}

            {currentStep === 'recap' ? (
              <div className="learning-recap" data-testid="practice-answer-reveal">
                <div className="learning-recap__word">
                  <h2>{currentCard.word} <span>({formatWordClass(currentCard.wordClass)})</span></h2>
                  <button className="icon-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}><Volume2 size={18} /></button>
                </div>
                <p className="learning-recap__ipa">{formatIpa(currentCard.ipaPronunciation)}</p>
                <p><em>Definition:</em> {currentCard.meaningEn}</p>
                <p><em>Meaning:</em> {currentCard.meaningVn}</p>
                <p><em>Example:</em> {currentCard.example}</p>
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
                  <>
                    <label className="practice-label" htmlFor="practice-answer-input">Type the target word</label>
                    <input id="practice-answer-input" className="practice-input" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)} data-testid="practice-answer-input" />
                    <button className="primary-button" type="button" onClick={submitTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0}><PenSquare size={16} /> Submit answer</button>
                    <button className="secondary-button practice-skip-button" type="button" onClick={revealAndSkip}>Reveal / skip</button>
                  </>
                ) : null}

                {feedback ? <p className={`answer-feedback answer-feedback--${feedback}`} role="status">{feedback === 'correct' ? 'Correct' : 'Wrong'}</p> : null}
                {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}
                {pronunciationPairExhausted && !resolvedOutcome ? (
                  <div className="deck-actions">
                    {!pronunciationRetryUsed ? <button className="secondary-button" type="button" onClick={retryPronunciationPair}><RotateCcw size={16} /> Retry · 2 more attempts</button> : null}
                    <button className="primary-button" type="button" onClick={revealAndSkip}>Skip</button>
                  </div>
                ) : null}
                {resolvedOutcome ? <button className="primary-button" type="button" onClick={continueResolvedStep}>Continue</button> : null}
              </div>
            )}
          </article>
        </section>
      ) : null}
    </>
  )
}
