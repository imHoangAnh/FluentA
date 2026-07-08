import { ArrowLeft, CheckCircle2, LogOut, Mic, MicOff, PenSquare, TriangleAlert, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'

type PracticeOutcome = 'correct' | 'wrong'
type PracticeOrderType = 'sequential' | 'shuffle'
type BrowserSpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionErrorEventLike = { error?: string }

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

function getSpeechRecognitionConstructor() {
  const browserWindow = window as BrowserSpeechWindow
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
}

function shuffleCards(cards: flashcardApi.FlashcardCard[]) {
  return [...cards].sort(() => Math.random() - 0.5)
}

type PracticeReviewStatus = 'added' | 'alreadyInReview'

export function PracticeSessionPage() {
  const { pageId = '' } = useParams()
  const logout = useAuthStore((state) => state.logout)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [orderType, setOrderType] = useState<PracticeOrderType>('sequential')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [resolvedOutcome, setResolvedOutcome] = useState<PracticeOutcome | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState(false)
  const [wordHasMistake, setWordHasMistake] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [correctWords, setCorrectWords] = useState(0)
  const [wrongWords, setWrongWords] = useState(0)
  const [sessionCards, setSessionCards] = useState<flashcardApi.FlashcardCard[]>([])
  const [completedSession, setCompletedSession] = useState<{ correctCards: number; wrongCards: number } | null>(null)
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, PracticeReviewStatus>>({})
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const sessionQuery = useQuery({ queryKey: ['flashcard', 'page-session', pageId], queryFn: () => flashcardApi.getPageSession(pageId), enabled: Boolean(pageId) })
  const practiceSettingsQuery = useQuery({ queryKey: ['practice', 'settings'], queryFn: flashcardApi.getPracticeSettings })
  const saveSummaryMutation = useMutation({ mutationFn: flashcardApi.createPracticeSessionSummary })
  const addToReviewMutation = useMutation({ mutationFn: flashcardApi.addPracticeWordsToReview })

  const currentCard = sessionCards[currentIndex] ?? null
  const language = sessionQuery.data?.boardLanguage ?? 'en'
  const modeSequence = useMemo(() => [...(practiceSettingsQuery.data?.modeSequence ?? ['dictation', 'meaningToWord', 'pronunciation']), 'recap' as const], [practiceSettingsQuery.data?.modeSequence])
  const currentStep = modeSequence[currentStepIndex] ?? 'recap'
  const recognitionSupported = Boolean(getSpeechRecognitionConstructor())

  useEffect(() => {
    if (!sessionStarted || !currentCard || resolvedOutcome || currentStep === 'meaningToWord' || currentStep === 'recap') return
    speakWord(currentCard.word, language)
  }, [currentCard, currentStep, language, resolvedOutcome, sessionStarted])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  function resetStepState() {
    setTypedAnswer('')
    setTranscript('')
    setFeedback(null)
    setResolvedOutcome(null)
    setRevealedAnswer(false)
    setRecognitionError(null)
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function startPractice() {
    const cards = sessionQuery.data?.words ?? []
    const initialReviewStatuses = cards.reduce<Record<string, PracticeReviewStatus>>((state, card) => {
      if (card.isInReview) {
        state[card.wordId] = 'alreadyInReview'
      }

      return state
    }, {})
    setSessionCards(orderType === 'shuffle' ? shuffleCards(cards) : [...cards])
    setSessionStarted(true)
    setCurrentIndex(0)
    setCurrentStepIndex(0)
    setCorrectWords(0)
    setWrongWords(0)
    setCompletedSession(null)
    setWordHasMistake(false)
    setReviewStatuses(initialReviewStatuses)
    saveSummaryMutation.reset()
    addToReviewMutation.reset()
    resetStepState()
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

  function moveToNextStep(outcome: PracticeOutcome) {
    if (currentStep === 'recap') {
      advanceAfterRecap(outcome)
      return
    }

    setResolvedOutcome(outcome)
    setRevealedAnswer(true)
    if (outcome === 'wrong') {
      setWordHasMistake(true)
    }
    setFeedback(outcome === 'correct' ? 'Step complete.' : 'Step skipped. The word will count as wrong for this session.')
  }

  function continueFromReveal() {
    if (currentStep === 'recap') {
      advanceAfterRecap(resolvedOutcome ?? 'wrong')
      return
    }

    setCurrentStepIndex((value) => value + 1)
    resetStepState()
  }

  function submitTypedAnswer() {
    if (!currentCard || resolvedOutcome || currentStep === 'recap') return
    if (normalizeAnswer(typedAnswer) === normalizeAnswer(currentCard.word)) {
      moveToNextStep('correct')
      return
    }

    setFeedback('That answer does not match yet. Try again or reveal the answer.')
  }

  function submitTranscriptAnswer() {
    if (!currentCard || resolvedOutcome) return
    if (normalizeAnswer(transcript) === normalizeAnswer(currentCard.word)) {
      moveToNextStep('correct')
      return
    }

    setFeedback('Transcript did not match the target word. Listen and try again.')
  }

  function revealAndSkip() {
    if (!currentCard) return
    moveToNextStep('wrong')
  }

  function startListening() {
    const RecognitionConstructor = getSpeechRecognitionConstructor()
    if (!RecognitionConstructor) {
      setRecognitionError('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new RecognitionConstructor()
    recognition.lang = getLanguageProfile(language).speechLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      setTranscript(event.results[0]?.[0]?.transcript?.trim() ?? '')
      setRecognitionError(null)
    }
    recognition.onerror = (event) => {
      setRecognitionError(event.error ? `Speech recognition error: ${event.error}.` : 'Speech recognition could not capture your speech.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    setTranscript('')
    setIsListening(true)
    recognition.start()
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
    if (!completedSession) return
    await persistCompletion(completedSession.correctCards, completedSession.wrongCards)
  }

  const currentReviewStatus = currentCard ? (reviewStatuses[currentCard.wordId] ?? null) : null

  return (
    <main className="workspace review-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Practice navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards"><ArrowLeft size={17} /> Back to decks</Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout"><LogOut size={18} /></button>
        </nav>
      </header>

      {sessionQuery.data && !sessionStarted && !completedSession ? (
        <section className="review-setup practice-setup">
          <span className="preview-label">Practice</span>
          <h1>{sessionQuery.data.pageName}</h1>
          <p>This page will run the global mode sequence, then recap each word before advancing.</p>
          <div className="review-mode-options" role="group" aria-label="Practice order">
            <button className={orderType === 'sequential' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setOrderType('sequential')}>Sequential</button>
            <button className={orderType === 'shuffle' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setOrderType('shuffle')}>Shuffle</button>
          </div>
          <div className="practice-summary__stats">
            {modeSequence.map((step) => (
              <div key={step}>
                <strong>{step === 'meaningToWord' ? 'Meaning -> Word' : step}</strong>
                <span>{step === 'recap' ? 'Always last' : 'Enabled'}</span>
              </div>
            ))}
          </div>
          <button className="primary-button review-start" type="button" onClick={startPractice} data-testid="start-practice-session">
            Start practice
          </button>
        </section>
      ) : null}

      {!sessionStarted && completedSession ? (
        <section className="review-summary practice-summary" data-testid="practice-summary">
          <CheckCircle2 size={38} />
          <span className="preview-label">Practice complete</span>
          <h1>{sessionQuery.data?.pageName}</h1>
          <p>{correctWords} words completed cleanly and {wrongWords} words needed reveal/skip across {sessionCards.length} practiced words.</p>
          {saveSummaryMutation.isSuccess ? (
            <Link className="primary-button review-summary__done" to="/flashcards/practice">Done</Link>
          ) : (
            <button
              className="primary-button review-summary__done"
              type="button"
              onClick={() => void finalizePractice()}
              disabled={saveSummaryMutation.isPending}
            >
              Finish
            </button>
          )}
          {saveSummaryMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to save this practice result. Try again.</p> : null}
        </section>
      ) : null}

      {sessionStarted && currentCard ? (
        <section className="review-session practice-session">
          <div className="review-progress">
            <div>
              <span className="preview-label">{currentStep === 'meaningToWord' ? 'Meaning -> Word' : currentStep} · {orderType}</span>
              <strong>{currentIndex + 1} / {sessionCards.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={sessionCards.length} />
          </div>

          <article className={revealedAnswer ? 'review-card review-card--revealed' : 'review-card'} data-testid="active-practice-card">
            {currentStep === 'dictation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Dictation</span>
                <h2>Listen, then type the exact word</h2>
                <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}>
                  <Volume2 size={18} />
                </button>
              </div>
            ) : null}

            {currentStep === 'meaningToWord' ? (
              <div className="practice-prompt">
                <span className="preview-label">Meaning -&gt; Word</span>
                <h2>Type the target word</h2>
                <p>{currentCard.meaningVn}</p>
                <p>{currentCard.meaningEn}</p>
              </div>
            ) : null}

            {currentStep === 'pronunciation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Pronunciation</span>
                <h2>Listen, speak, then check the transcript</h2>
                {!recognitionSupported ? <p className="practice-mode-warning"><TriangleAlert size={16} /> Speech recognition is unavailable in this browser.</p> : null}
                <div className="practice-pronunciation-controls">
                  <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}>
                    <Volume2 size={18} />
                  </button>
                  <button className="secondary-button" type="button" onClick={startListening} disabled={isListening || !recognitionSupported}>
                    <Mic size={16} /> Start listening
                  </button>
                  <button className="secondary-button" type="button" onClick={() => recognitionRef.current?.stop()} disabled={!isListening}>
                    <MicOff size={16} /> Stop
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 'recap' ? (
              <div className="review-card__answer practice-answer-reveal" data-testid="practice-answer-reveal">
                <div><span>Word</span><strong>{currentCard.word}</strong></div>
                <div><span>Vietnamese meaning</span><p>{currentCard.meaningVn}</p></div>
                <div><span>English meaning</span><p>{currentCard.meaningEn}</p></div>
                <div className="deck-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  >
                    Previous
                  </button>
                  {currentReviewStatus === 'alreadyInReview' ? (
                    <button className="secondary-button" type="button" disabled>
                      Already in Review
                    </button>
                  ) : currentReviewStatus === 'added' ? (
                    <button className="secondary-button" type="button" disabled>
                      Added
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void addCurrentWordToReview()}
                      disabled={addToReviewMutation.isPending}
                    >
                      Add to Review
                    </button>
                  )}
                  <button className="primary-button" type="button" onClick={() => advanceAfterRecap(wordHasMistake ? 'wrong' : 'correct')} data-testid="practice-next-card">
                    {currentIndex + 1 >= sessionCards.length ? 'Finish practice' : 'Next'}
                  </button>
                </div>
                {addToReviewMutation.isError ? <p className="flashcard-status flashcard-status--error">Unable to add this word to Review. Try again.</p> : null}
              </div>
            ) : (
              <div className="practice-answer-panel">
                {currentStep === 'pronunciation' ? (
                  <>
                    <label className="practice-label" htmlFor="practice-transcript">Transcript</label>
                    <textarea id="practice-transcript" className="practice-input practice-input--multiline" value={transcript} onChange={(event) => setTranscript(event.target.value)} data-testid="practice-transcript" />
                    <button className="primary-button" type="button" onClick={submitTranscriptAnswer} disabled={normalizeAnswer(transcript).length === 0}>Check transcript</button>
                  </>
                ) : (
                  <>
                    <label className="practice-label" htmlFor="practice-answer-input">Type the target word</label>
                    <input id="practice-answer-input" className="practice-input" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)} data-testid="practice-answer-input" />
                    <button className="primary-button" type="button" onClick={submitTypedAnswer} disabled={normalizeAnswer(typedAnswer).length === 0}><PenSquare size={16} /> Submit answer</button>
                  </>
                )}

                <button className="secondary-button practice-skip-button" type="button" onClick={revealAndSkip}>Reveal / skip</button>
                {recognitionError ? <p className="flashcard-status flashcard-status--error">{recognitionError}</p> : null}
                {feedback ? <p className="practice-feedback">{feedback}</p> : null}
              </div>
            )}

            {revealedAnswer && currentStep !== 'recap' ? (
              <div className="review-card__answer practice-answer-reveal" data-testid="practice-answer-reveal">
                <div><span>Target word</span><strong>{currentCard.word}</strong></div>
                <div><span>Vietnamese meaning</span><p>{currentCard.meaningVn}</p></div>
                <div><span>English meaning</span><p>{currentCard.meaningEn}</p></div>
                <button className="primary-button" type="button" onClick={continueFromReveal} data-testid="practice-next-card">
                  Continue
                </button>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}
    </main>
  )
}
