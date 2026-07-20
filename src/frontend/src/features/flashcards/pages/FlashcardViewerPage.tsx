import { ChevronLeft, ChevronRight, RotateCw, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

export function FlashcardViewerPage() {
  const { pageId = '' } = useParams()
  return <FlashcardViewerPageContent key={pageId} pageId={pageId} />
}

function FlashcardViewerPageContent({ pageId }: { pageId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['flashcard', 'page-session', pageId],
    queryFn: () => flashcardApi.getPageSession(pageId),
    enabled: Boolean(pageId),
  })

  const cards = sessionQuery.data?.words ?? []
  const currentCard = cards[currentIndex] ?? null
  const boardLanguage = sessionQuery.data?.boardLanguage ?? 'en'
  const isFinalCard = currentIndex + 1 >= cards.length
  const speechSupported = browserSpeechSupported()
  const formattedIpa = formatIpa(currentCard?.ipaPronunciation)
  const backDensity = useMemo(() => getBackDensity(currentCard), [currentCard])
  const backTypography = backDensityClasses[backDensity]

  const progressLabel = useMemo(() => {
    if (cards.length === 0) {
      return '0 / 0'
    }

    return `${currentIndex + 1} / ${cards.length}`
  }, [cards.length, currentIndex])

  useEffect(() => cancelSpeech, [])

  function goPrevious() {
    cancelSpeech()
    setCurrentIndex((value) => Math.max(0, value - 1))
    setFlipped(false)
  }

  function goNext() {
    cancelSpeech()
    setCurrentIndex((value) => Math.min(cards.length - 1, value + 1))
    setFlipped(false)
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline" size="sm"><Link to="/flashcards">Back to decks</Link></Button>
      </div>
      {sessionQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading flashcard viewer...</p> : null}
      {sessionQuery.isError ? <p role="alert" className="text-sm text-destructive">This page is unavailable.</p> : null}

      {sessionQuery.data && cards.length === 0 ? (
        <Card className="mx-auto max-w-xl"><CardContent className="grid gap-4 p-8 text-center"><p className="m-0 text-sm font-semibold text-primary">Flashcard viewer</p><h2 className="m-0 text-2xl font-semibold">{sessionQuery.data.pageName}</h2><p className="m-0 text-sm text-muted-foreground">This page has no words yet.</p><Button asChild className="justify-self-center"><Link to="/flashcards">Finish</Link></Button></CardContent></Card>
      ) : null}

      {sessionQuery.data && currentCard ? (
        <section className="grid w-full gap-5">
          <div className="mx-auto grid w-full gap-5 md:w-2/3" data-testid="flashcard-viewer-content">
            <div className="flex items-end justify-between gap-4"><div><p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Vocabulary page</p><h2 className="m-0 mt-1 text-2xl font-semibold tracking-[-0.02em]">{sessionQuery.data.pageName}</h2></div><div className="text-right"><p className="m-0 text-xs text-muted-foreground">Flashcard</p><strong className="text-lg">{progressLabel}</strong></div></div>
            <progress className="h-1.5 w-full overflow-hidden rounded-full accent-primary" value={currentIndex + 1} max={Math.max(cards.length, 1)} />
            <p className="m-0 text-sm text-muted-foreground">Click the card to flip between prompt and answer.</p>

            <div
              className="relative h-[400px] w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:h-[420px] lg:h-[500px]"
              data-testid="flashcard-stage"
              data-density={flipped ? backDensity : undefined}
            >
              <button
                className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                type="button"
                aria-label={flipped ? 'Show card front' : 'Show card back'}
                onClick={() => setFlipped((value) => !value)}
              />

              {!flipped ? (
                <div className="pointer-events-none relative z-10 flex h-full min-w-0 flex-col items-center justify-center gap-5 overflow-hidden p-5 text-center sm:p-6 lg:p-8">
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
                    className="pointer-events-auto rounded-full"
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Listen to ${currentCard.word}`}
                    aria-describedby={!speechSupported ? 'flashcard-audio-unavailable' : undefined}
                    disabled={!speechSupported}
                    onClick={() => speakWord(currentCard.word, boardLanguage)}
                  >
                    <Volume2 aria-hidden="true" />
                  </Button>
                  {!speechSupported ? <span id="flashcard-audio-unavailable" className="text-xs text-muted-foreground">Audio is unavailable in this browser.</span> : null}
                </div>
              ) : (
                <div
                  className="relative z-10 flex h-full min-h-0 min-w-0 cursor-pointer items-center p-5 text-left sm:p-6 lg:p-8"
                  onClick={() => setFlipped(false)}
                >
                  <div
                    className={cn('grid max-h-full w-full min-w-0 overflow-y-auto overscroll-contain pr-1 text-foreground', backTypography.spacing)}
                    data-testid="flashcard-back-content"
                  >
                    {currentCard.meaningEn.trim() ? (
                      <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                        <em className="font-medium">Definition:</em> {currentCard.meaningEn}
                      </p>
                    ) : null}
                    <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                      <em className="font-medium">Meaning:</em> {currentCard.meaningVn}
                    </p>
                    <p className={cn('m-0 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]', backTypography.content)}>
                      <em className="font-medium">Example:</em> {currentCard.example}
                    </p>
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
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" type="button" onClick={goPrevious} disabled={currentIndex === 0}><ChevronLeft /> Previous</Button>
              {isFinalCard ? (
                <div className="flex gap-2"><Button asChild variant="outline"><Link to="/flashcards">Finish</Link></Button><Button asChild><Link to={`/practice?deck=${pageId}`}>Let's practice</Link></Button></div>
              ) : (
                <Button type="button" onClick={goNext}>Next <ChevronRight /></Button>
              )}
            </div>
            <p className="m-0 flex items-center justify-center gap-2 text-xs text-muted-foreground"><RotateCw size={14} aria-hidden="true" /> Click anywhere on the card to flip</p>
          </div>
        </section>
      ) : null}
    </>
  )
}
