import { ArrowLeft, CheckCircle2, Ear, Languages, LogOut, Mic, MicOff, PenSquare, TriangleAlert, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { PracticeMode } from '../../lib/api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'

type PracticeOutcome = 'correct' | 'wrong'

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

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type SpeechRecognitionErrorEventLike = {
  error?: string
}

type CompletedSummary = {
  deckId: string
  deckName: string
  mode: PracticeMode
  totalCards: number
  correctCards: number
  wrongCards: number
}

const modeCards: {
  mode: PracticeMode
  title: string
  description: string
  icon: typeof Ear
}[] = [
  {
    mode: 'dictation',
    title: 'Dictation',
    description: 'Listen to the target word, then type it exactly.',
    icon: Ear,
  },
  {
    mode: 'meaningToWord',
    title: 'Meaning -> Word',
    description: 'Read Vietnamese and English meanings, then type the word.',
    icon: Languages,
  },
  {
    mode: 'pronunciation',
    title: 'Pronunciation',
    description: 'Listen, speak, then compare the browser transcript to the target word.',
    icon: Mic,
  },
]

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

function modeLabel(mode: PracticeMode) {
  return modeCards.find((item) => item.mode === mode)?.title ?? mode
}

function Summary({
  summary,
  saveError,
  isSaving,
  onRetry,
}: {
  summary: CompletedSummary
  saveError: boolean
  isSaving: boolean
  onRetry: () => void
}) {
  return (
    <section className="review-summary practice-summary" data-testid="practice-summary">
      <CheckCircle2 size={38} />
      <span className="preview-label">Practice complete</span>
      <h1>{summary.deckName}</h1>
      <p>{modeLabel(summary.mode)} finished with {summary.correctCards} correct and {summary.wrongCards} wrong across {summary.totalCards} cards.</p>
      <div className="practice-summary__stats">
        <div>
          <strong>{summary.totalCards}</strong>
          <span>Total cards</span>
        </div>
        <div>
          <strong>{summary.correctCards}</strong>
          <span>Correct cards</span>
        </div>
        <div>
          <strong>{summary.wrongCards}</strong>
          <span>Wrong cards</span>
        </div>
      </div>
      {isSaving ? <p className="flashcard-status">Saving your practice summary...</p> : null}
      {saveError ? (
        <div className="practice-save-error">
          <p className="flashcard-status flashcard-status--error">The session finished, but the practice summary did not save yet.</p>
          <button className="secondary-button" type="button" onClick={onRetry}>Retry save</button>
        </div>
      ) : null}
      <Link className="primary-button review-summary__done" to="/flashcards">Done</Link>
    </section>
  )
}

export function PracticeSessionPage() {
  const { deckId = '' } = useParams()
  const logout = useAuthStore((state) => state.logout)
  const [mode, setMode] = useState<PracticeMode | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error' | 'info'>('info')
  const [resolvedOutcome, setResolvedOutcome] = useState<PracticeOutcome | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [correctCards, setCorrectCards] = useState(0)
  const [wrongCards, setWrongCards] = useState(0)
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const sessionQuery = useQuery({
    queryKey: ['flashcard', 'deck-session', deckId],
    queryFn: () => flashcardApi.getDeckSession(deckId),
    enabled: Boolean(deckId),
  })

  const saveSummaryMutation = useMutation({
    mutationFn: flashcardApi.createPracticeSessionSummary,
  })

  const cards = sessionQuery.data?.cards ?? []
  const currentCard = cards[currentIndex] ?? null
  const selectedMode = mode ?? 'dictation'
  const recognitionSupported = Boolean(getSpeechRecognitionConstructor())
  const language = sessionQuery.data?.boardLanguage ?? 'en'
  const secondaryMeaningLabel = getLanguageProfile(language).secondaryMeaningLabel

  useEffect(() => {
    if (!sessionStarted || !currentCard || resolvedOutcome) return
    if (selectedMode === 'dictation' || selectedMode === 'pronunciation') {
      speakWord(currentCard.word, language)
    }
  }, [currentCard, language, resolvedOutcome, selectedMode, sessionStarted])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function resetCardState() {
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
    if (!mode || cards.length === 0) return
    setSessionStarted(true)
    setCurrentIndex(0)
    setCorrectCards(0)
    setWrongCards(0)
    setCompletedSummary(null)
    saveSummaryMutation.reset()
    resetCardState()
  }

  async function saveCompletedSummary(summary: CompletedSummary) {
    try {
      await saveSummaryMutation.mutateAsync({
        deckId: summary.deckId,
        mode: summary.mode,
        totalCards: summary.totalCards,
        correctCards: summary.correctCards,
        wrongCards: summary.wrongCards,
      })
    } catch {
      // The summary screen keeps a retry path when persistence fails.
    }
  }

  function finishCard(outcome: PracticeOutcome) {
    if (!currentCard || !mode || !sessionQuery.data) return

    const nextCorrectCards = correctCards + (outcome === 'correct' ? 1 : 0)
    const nextWrongCards = wrongCards + (outcome === 'wrong' ? 1 : 0)

    if (currentIndex + 1 >= cards.length) {
      const summary = {
        deckId: sessionQuery.data.deckId,
        deckName: sessionQuery.data.deckName,
        mode,
        totalCards: cards.length,
        correctCards: nextCorrectCards,
        wrongCards: nextWrongCards,
      }
      setCorrectCards(nextCorrectCards)
      setWrongCards(nextWrongCards)
      setSessionStarted(false)
      setCompletedSummary(summary)
      void saveCompletedSummary(summary)
      return
    }

    setCorrectCards(nextCorrectCards)
    setWrongCards(nextWrongCards)
    setCurrentIndex((value) => value + 1)
    resetCardState()
  }

  function submitTypedAnswer() {
    if (!currentCard || resolvedOutcome) return

    if (normalizeAnswer(typedAnswer) === normalizeAnswer(currentCard.word)) {
      setFeedback('Correct. Move to the next card when you are ready.')
      setFeedbackTone('success')
      setResolvedOutcome('correct')
      return
    }

    setFeedback('That spelling does not match yet. Try again or reveal the answer.')
    setFeedbackTone('error')
  }

  function submitTranscriptAnswer() {
    if (!currentCard || resolvedOutcome) return

    if (normalizeAnswer(transcript) === normalizeAnswer(currentCard.word)) {
      setFeedback('Transcript matched the target word. Continue when you are ready.')
      setFeedbackTone('success')
      setResolvedOutcome('correct')
      return
    }

    setFeedback('Transcript did not match the target word. Listen and try again.')
    setFeedbackTone('error')
  }

  function revealAndSkip() {
    if (!currentCard) return
    recognitionRef.current?.stop()
    setIsListening(false)
    setFeedback('This card counts as wrong for the practice summary.')
    setFeedbackTone('info')
    setResolvedOutcome('wrong')
    setRevealedAnswer(true)
  }

  function startListening() {
    const RecognitionConstructor = getSpeechRecognitionConstructor()
    if (!RecognitionConstructor) {
      setRecognitionError('Speech recognition is not supported in this browser.')
      return
    }

    recognitionRef.current?.stop()
    const recognition = new RecognitionConstructor()
    recognition.lang = getLanguageProfile(language).speechLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const nextTranscript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      setTranscript(nextTranscript)
      setRecognitionError(null)
      setFeedback(null)
    }
    recognition.onerror = (event) => {
      setRecognitionError(event.error ? `Speech recognition error: ${event.error}.` : 'Speech recognition could not capture your speech.')
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognitionRef.current = recognition
    setTranscript('')
    setRecognitionError(null)
    setFeedback(null)
    setIsListening(true)
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return (
    <main className="workspace review-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Practice navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards">
            <ArrowLeft size={17} /> Back to decks
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      {sessionQuery.isLoading ? <p className="flashcard-status">Loading practice deck...</p> : null}
      {sessionQuery.isError ? <p className="flashcard-status flashcard-status--error">This deck is unavailable for practice.</p> : null}

      {sessionQuery.data && !sessionStarted && !completedSummary ? (
        <section className="review-setup practice-setup">
          <span className="preview-label">Practice modes</span>
          <h1>{sessionQuery.data.deckName}</h1>
          <p>Practice uses all {cards.length} cards in saved order and never changes spaced-repetition scheduling.</p>
          {cards.length === 0 ? (
            <p className="flashcard-status flashcard-status--error">This deck has no cards to practice yet.</p>
          ) : (
            <>
              <div className="practice-mode-grid" role="group" aria-label="Practice mode">
                {modeCards.map((option) => {
                  const Icon = option.icon
                  const active = selectedMode === option.mode
                  return (
                    <button
                      key={option.mode}
                      className={active ? 'review-mode review-mode--active practice-mode-card' : 'review-mode practice-mode-card'}
                      type="button"
                      onClick={() => setMode(option.mode)}
                      data-testid={`practice-mode-${option.mode}`}
                    >
                      <Icon size={20} />
                      <span>{option.title}</span>
                      <small>{option.description}</small>
                      {option.mode === 'pronunciation' && !recognitionSupported ? (
                        <small className="practice-mode-warning">Speech recognition is unavailable in this browser.</small>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <button className="primary-button review-start" type="button" onClick={startPractice} data-testid="start-practice-session">
                Start {modeLabel(selectedMode)} practice
              </button>
            </>
          )}
        </section>
      ) : null}

      {completedSummary ? (
        <Summary
          summary={completedSummary}
          saveError={saveSummaryMutation.isError}
          isSaving={saveSummaryMutation.isPending}
          onRetry={() => void saveCompletedSummary(completedSummary)}
        />
      ) : null}

      {sessionStarted && sessionQuery.data && mode === 'pronunciation' && !recognitionSupported ? (
        <section className="review-setup practice-unsupported" data-testid="practice-unsupported">
          <TriangleAlert size={36} />
          <span className="preview-label">Pronunciation unavailable</span>
          <h1>Speech recognition is not supported here</h1>
          <p>This browser can still use Dictation and Meaning -&gt; Word practice, but pronunciation transcription needs a supported Web Speech recognition implementation.</p>
          <button className="secondary-button" type="button" onClick={() => setSessionStarted(false)}>Back to mode selection</button>
        </section>
      ) : null}

      {sessionStarted && sessionQuery.data && currentCard && !(mode === 'pronunciation' && !recognitionSupported) ? (
        <section className="review-session practice-session">
          <div className="review-progress">
            <div>
              <span className="preview-label">
                {modeLabel(mode ?? 'dictation')} · {sessionQuery.data.deckType === 'AllWords' ? 'All Words' : 'Page Deck'}
              </span>
              <strong>{currentIndex + 1} / {cards.length}</strong>
            </div>
            <progress value={currentIndex + 1} max={cards.length} />
          </div>

          <article className={revealedAnswer ? 'review-card review-card--revealed' : 'review-card'} data-testid="active-practice-card">
            {mode === 'dictation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Dictation</span>
                <h2>Listen, then type the exact word</h2>
                <p>No hints are shown for this mode. Replay the word as many times as you need.</p>
                <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}>
                  <Volume2 size={18} />
                </button>
              </div>
            ) : null}

            {mode === 'meaningToWord' ? (
              <div className="practice-prompt">
                <span className="preview-label">Meaning -&gt; Word</span>
                <h2>Type the target word</h2>
                <div className="practice-meaning-grid">
                  <div>
                    <span>Vietnamese meaning</span>
                    <strong>{currentCard.meaningVn}</strong>
                  </div>
                  <div>
                    <span>{secondaryMeaningLabel}</span>
                    <p>{currentCard.meaningEn}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {mode === 'pronunciation' ? (
              <div className="practice-prompt">
                <span className="preview-label">Pronunciation</span>
                <h2>Listen, speak, then check the transcript</h2>
                <p>Playback follows the board language. The transcript must match the target word exactly after trim and case normalization.</p>
                <div className="practice-pronunciation-controls">
                  <button className="icon-button practice-audio-button" type="button" aria-label="Replay word audio" onClick={() => speakWord(currentCard.word, language)}>
                    <Volume2 size={18} />
                  </button>
                  <button className="secondary-button" type="button" onClick={startListening} disabled={isListening || Boolean(resolvedOutcome)}>
                    <Mic size={16} /> Start listening
                  </button>
                  <button className="secondary-button" type="button" onClick={stopListening} disabled={!isListening}>
                    <MicOff size={16} /> Stop
                  </button>
                </div>
              </div>
            ) : null}

            <div className="practice-answer-panel">
              {mode === 'pronunciation' ? (
                <>
                  <label className="practice-label" htmlFor="practice-transcript">Transcript</label>
                  <textarea
                    id="practice-transcript"
                    className="practice-input practice-input--multiline"
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    disabled={Boolean(resolvedOutcome)}
                    placeholder="Speech recognition transcript appears here."
                    data-testid="practice-transcript"
                  />
                  <button className="primary-button" type="button" onClick={submitTranscriptAnswer} disabled={Boolean(resolvedOutcome) || normalizeAnswer(transcript).length === 0}>
                    Check transcript
                  </button>
                </>
              ) : (
                <>
                  <label className="practice-label" htmlFor="practice-answer-input">Type the target word</label>
                  <input
                    id="practice-answer-input"
                    className="practice-input"
                    value={typedAnswer}
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    disabled={Boolean(resolvedOutcome)}
                    autoComplete="off"
                    data-testid="practice-answer-input"
                  />
                  <button className="primary-button" type="button" onClick={submitTypedAnswer} disabled={Boolean(resolvedOutcome) || normalizeAnswer(typedAnswer).length === 0}>
                    <PenSquare size={16} /> Submit answer
                  </button>
                </>
              )}

              <button className="secondary-button practice-skip-button" type="button" onClick={revealAndSkip} disabled={Boolean(resolvedOutcome)}>
                Reveal / skip
              </button>

              {recognitionError ? <p className="flashcard-status flashcard-status--error">{recognitionError}</p> : null}
              {feedback ? (
                <p className={feedbackTone === 'error' ? 'practice-feedback practice-feedback--error' : feedbackTone === 'success' ? 'practice-feedback practice-feedback--success' : 'practice-feedback'}>
                  {feedback}
                </p>
              ) : null}
            </div>

            {revealedAnswer || resolvedOutcome === 'correct' ? (
              <div className="review-card__answer practice-answer-reveal" data-testid="practice-answer-reveal">
                <div>
                  <span>Target word</span>
                  <strong>{currentCard.word}</strong>
                </div>
                <div>
                  <span>Vietnamese meaning</span>
                  <p>{currentCard.meaningVn}</p>
                </div>
                <div>
                  <span>{secondaryMeaningLabel}</span>
                  <p>{currentCard.meaningEn}</p>
                </div>
                <button className="primary-button" type="button" onClick={() => finishCard(resolvedOutcome ?? 'wrong')} data-testid="practice-next-card">
                  {currentIndex + 1 >= cards.length ? 'Finish practice' : 'Next card'}
                </button>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}
    </main>
  )
}
