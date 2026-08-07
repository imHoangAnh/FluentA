import { ChevronLeft, ChevronRight, Keyboard, RotateCcw, Shuffle, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../api/flashcard.api'
import type { FlashcardCard } from '../api/flashcard.api'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

type BackDensity = 'comfortable' | 'compact' | 'dense'

const backDensityClasses: Record<BackDensity, { content: string; supporting: string; spacing: string }> = {
  comfortable: {
    content: 'text-base leading-7',
    supporting: 'text-xs leading-5',
    spacing: 'gap-5',
  },
  compact: {
    content: 'text-sm leading-6',
    supporting: 'text-xs leading-5',
    spacing: 'gap-4',
  },
  dense: {
    content: 'text-xs leading-5',
    supporting: 'text-[11px] leading-4',
    spacing: 'gap-3',
  },
}

function formatIpa(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, '').trim()
  return normalized ? `/${normalized}/` : null
}

function getBackDensity(card: FlashcardCard | null): BackDensity {
  if (!card) return 'comfortable'

  const contentLength = [card.meaningEn, card.meaningVn, card.example, card.synonyms, card.antonyms]
    .filter(Boolean)
    .join(' ')
    .length

  if (contentLength > 1000) return 'dense'
  if (contentLength > 500) return 'compact'
  return 'comfortable'
}

function browserSpeechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window
}

function cancelSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function speakWord(word: string, language: string) {
  if (!browserSpeechSupported()) return

  cancelSpeech()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function shuffleArray(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = indices[i]
    indices[i] = indices[j]
    indices[j] = temp
  }
  return indices
}

export function FlashcardViewerPage() {
  const { pageId = '' } = useParams()
  return <FlashcardViewerPageContent key={pageId} pageId={pageId} />
}

function FlashcardViewerPageContent({ pageId }: { pageId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | null>(null)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([])

  const sessionQuery = useQuery({
    queryKey: ['flashcard', 'page-session', pageId],
    queryFn: () => flashcardApi.getPageSession(pageId),
    enabled: Boolean(pageId),
  })

  const rawCards = useMemo(() => sessionQuery.data?.words ?? [], [sessionQuery.data?.words])

  const activeIndices = useMemo(() => {
    if (!isShuffled || rawCards.length === 0) {
      return rawCards.map((_, index) => index)
    }
    if (shuffledOrder.length === rawCards.length) {
      return shuffledOrder
    }
    return shuffleArray(rawCards.length)
  }, [rawCards, isShuffled, shuffledOrder])

  const currentCardIndex = activeIndices[currentIndex] ?? 0
  const currentCard = rawCards[currentCardIndex] ?? null
  const boardLanguage = sessionQuery.data?.boardLanguage ?? 'en'
  const isFinalCard = currentIndex + 1 >= rawCards.length
  const speechSupported = browserSpeechSupported()
  const formattedIpa = formatIpa(currentCard?.ipaPronunciation)
  const backDensity = useMemo(() => getBackDensity(currentCard), [currentCard])
  const backTypography = backDensityClasses[backDensity]

  const progressLabel = useMemo(() => {
    if (rawCards.length === 0) {
      return '0 / 0'
    }
    return `${currentIndex + 1} / ${rawCards.length}`
  }, [rawCards.length, currentIndex])

  useEffect(() => cancelSpeech, [])

  const goPrevious = useCallback(() => {
    if (currentIndex === 0) return
    cancelSpeech()
    setSlideDirection('prev')
    setCurrentIndex((value) => Math.max(0, value - 1))
    setFlipped(false)
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex >= rawCards.length - 1) return
    cancelSpeech()
    setSlideDirection('next')
    setCurrentIndex((value) => Math.min(rawCards.length - 1, value + 1))
    setFlipped(false)
  }, [currentIndex, rawCards.length])

  const toggleShuffle = useCallback(() => {
    cancelSpeech()
    if (!isShuffled) {
      const order = shuffleArray(rawCards.length)
      setShuffledOrder(order)
      setIsShuffled(true)
    } else {
      setIsShuffled(false)
      setShuffledOrder([])
    }
    setCurrentIndex(0)
    setFlipped(false)
    setSlideDirection(null)
  }, [isShuffled, rawCards.length])

  const restartDeck = useCallback(() => {
    cancelSpeech()
    setCurrentIndex(0)
    setFlipped(false)
    setSlideDirection(null)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        setFlipped((val) => !val)
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        goPrevious()
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        goNext()
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault()
        toggleShuffle()
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        restartDeck()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrevious, restartDeck, toggleShuffle])

  return (
    <>
      {sessionQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading flashcard viewer...</p> : null}
      {sessionQuery.isError ? <p role="alert" className="text-sm text-destructive">This page is unavailable.</p> : null}

      {sessionQuery.data && rawCards.length === 0 ? (
        <Card className="mx-auto max-w-xl"><CardContent className="grid gap-4 p-8 text-center"><p className="m-0 text-sm font-semibold text-primary">Flashcard viewer</p><h2 className="m-0 text-2xl font-semibold">{sessionQuery.data.pageName}</h2><p className="m-0 text-sm text-muted-foreground">This page has no words yet.</p><Button asChild className="justify-self-center"><Link to="/flashcards">Finish</Link></Button></CardContent></Card>
      ) : null}

      {sessionQuery.data && currentCard ? (
        <section className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center py-4">
          <div className="mx-auto grid w-full max-w-5xl gap-6" data-testid="flashcard-viewer-content">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="m-0 text-2xl font-semibold tracking-[-0.02em]">{sessionQuery.data.pageName}</h2>
              </div>
              <div className="text-center">
                <strong className="text-lg font-semibold">{progressLabel}</strong>
              </div>
              <div className="flex items-center justify-end gap-2 flex-1">
                <Button
                  variant={isShuffled ? 'default' : 'outline'}
                  size="sm"
                  type="button"
                  aria-label={isShuffled ? 'Disable deck shuffle' : 'Enable deck shuffle'}
                  onClick={toggleShuffle}
                  className="gap-1.5"
                >
                  <Shuffle className="h-4 w-4" />
                  <span className="hidden sm:inline">{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  aria-label="Restart deck from first card"
                  onClick={restartDeck}
                  title="Restart deck (R)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <progress className="h-2 w-full overflow-hidden rounded-full accent-primary" value={currentIndex + 1} max={Math.max(rawCards.length, 1)} />

            {/* 3D Stage & Card Container */}
            <div
              key={`${currentIndex}-${isShuffled ? 'shuffled' : 'normal'}`}
              className={cn(
                'flashcard-perspective relative h-[440px] w-full min-w-0 sm:h-[500px] lg:h-[580px]',
                slideDirection === 'next' && 'flashcard-slide-next',
                slideDirection === 'prev' && 'flashcard-slide-prev'
              )}
              data-testid="flashcard-stage"
              data-density={flipped ? backDensity : undefined}
              onAnimationEnd={() => setSlideDirection(null)}
            >
              <div
                className={cn(
                  'flashcard-flipper',
                  flipped && 'is-flipped'
                )}
              >
                {/* FRONT FACE (3D Card entity) */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Show card back"
                  onClick={() => setFlipped(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setFlipped(true)
                    }
                  }}
                  className={cn(
                    'flashcard-card-face flashcard-card-front flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-5 p-5 text-center sm:p-6 lg:p-8',
                    flipped ? 'pointer-events-none' : 'pointer-events-auto'
                  )}
                  aria-hidden={flipped}
                >
                  <p className="m-0 w-full min-w-0 whitespace-normal break-words text-lg font-semibold leading-7 text-foreground [overflow-wrap:anywhere]">
                    {currentCard.word} ({currentCard.wordClass.toLowerCase()})
                  </p>
                  {formattedIpa ? (
                    <p className="m-0 w-full min-w-0 whitespace-normal break-words text-lg leading-7 text-muted-foreground [overflow-wrap:anywhere]">
                      {formattedIpa}
                    </p>
                  ) : (
                    <p className="m-0 text-sm text-destructive" role="alert">IPA is unavailable. Refresh after the API restarts.</p>
                  )}
                  <Button
                    className="pointer-events-auto z-30 rounded-full"
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Listen to ${currentCard.word}`}
                    aria-describedby={!speechSupported ? 'flashcard-audio-unavailable' : undefined}
                    disabled={!speechSupported}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      speakWord(currentCard.word, boardLanguage)
                    }}
                  >
                    <Volume2 aria-hidden="true" />
                  </Button>
                  {!speechSupported ? <span id="flashcard-audio-unavailable" className="text-xs text-muted-foreground">Audio is unavailable in this browser.</span> : null}
                </div>

                {/* BACK FACE (3D Card entity) */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Show card front"
                  onClick={() => setFlipped(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setFlipped(false)
                    }
                  }}
                  className={cn(
                    'flashcard-card-face flashcard-card-back flex h-full min-h-0 min-w-0 cursor-pointer items-center p-5 text-left sm:p-6 lg:p-8',
                    !flipped ? 'pointer-events-none' : 'pointer-events-auto'
                  )}
                  aria-hidden={!flipped}
                >
                  <div
                    className={cn('grid max-h-full w-full min-w-0 overflow-y-auto overscroll-contain pr-1 text-foreground', backTypography.spacing)}
                    data-testid="flashcard-back-content"
                  >
                    {currentCard.meaningEn?.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                        <em className="font-medium">Definition:</em> {currentCard.meaningEn}
                      </p>
                    ) : null}
                    {currentCard.meaningVn?.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                        <em className="font-medium">Meaning:</em> {currentCard.meaningVn}
                      </p>
                    ) : null}
                    {currentCard.example?.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                        <em className="font-medium">Example:</em> {currentCard.example}
                      </p>
                    ) : null}
                    {currentCard.synonyms?.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words text-muted-foreground [overflow-wrap:anywhere]', backTypography.supporting)}>
                        <em className="font-medium text-foreground">Synonyms:</em> {currentCard.synonyms}
                      </p>
                    ) : null}
                    {currentCard.antonyms?.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words text-muted-foreground [overflow-wrap:anywhere]', backTypography.supporting)}>
                        <em className="font-medium text-foreground">Antonyms:</em> {currentCard.antonyms}
                      </p>
                    ) : null}
                    {!currentCard.meaningEn?.trim() && !currentCard.meaningVn?.trim() && !currentCard.example?.trim() ? (
                      <p className="m-0 text-sm italic text-muted-foreground">No definition or example recorded for this word.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation and Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" type="button" onClick={goPrevious} disabled={currentIndex === 0}>
                <ChevronLeft /> Previous
              </Button>
              {isFinalCard ? (
                <div className="flex gap-2">
                  <Button asChild variant="outline"><Link to="/flashcards">Finish</Link></Button>
                  <Button asChild><Link to={`/practice?deck=${pageId}`}>Let's practice</Link></Button>
                </div>
              ) : (
                <Button type="button" onClick={goNext}>
                  Next <ChevronRight />
                </Button>
              )}
            </div>

            {/* Keyboard Shortcuts Hint Bar (Borderless) */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Keyboard size={14} /> Shortcuts:
              </span>
              <span><kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] border border-border shadow-xs">Space</kbd> Flip</span>
              <span><kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] border border-border shadow-xs">←</kbd> Prev</span>
              <span><kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] border border-border shadow-xs">→</kbd> Next</span>
              <span><kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] border border-border shadow-xs">S</kbd> Shuffle</span>
              <span><kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] border border-border shadow-xs">R</kbd> Reset</span>
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
