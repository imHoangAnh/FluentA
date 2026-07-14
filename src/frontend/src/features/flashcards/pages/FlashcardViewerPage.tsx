import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as flashcardApi from '../api/flashcard.api'
import { getLanguageProfile } from '@/shared/lib/language'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

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
  const secondaryMeaningLabel = getLanguageProfile(sessionQuery.data?.boardLanguage).secondaryMeaningLabel
  const isFinalCard = currentIndex + 1 >= cards.length

  const progressLabel = useMemo(() => {
    if (cards.length === 0) {
      return '0 / 0'
    }

    return `${currentIndex + 1} / ${cards.length}`
  }, [cards.length, currentIndex])

  function goPrevious() {
    setCurrentIndex((value) => Math.max(0, value - 1))
    setFlipped(false)
  }

  function goNext() {
    setCurrentIndex((value) => Math.min(cards.length - 1, value + 1))
    setFlipped(false)
  }

  return (
    <AppShell title="Flashcard viewer" description="Flip cards and move at your pace." headerActions={<Button asChild variant="outline" size="sm"><Link to="/flashcards">Back to decks</Link></Button>}>
      {sessionQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading flashcard viewer...</p> : null}
      {sessionQuery.isError ? <p role="alert" className="text-sm text-destructive">This page is unavailable.</p> : null}

      {sessionQuery.data && cards.length === 0 ? (
        <Card className="mx-auto max-w-xl"><CardContent className="grid gap-4 p-8 text-center"><p className="m-0 text-sm font-semibold text-primary">Flashcard viewer</p><h2 className="m-0 text-2xl font-semibold">{sessionQuery.data.pageName}</h2><p className="m-0 text-sm text-muted-foreground">This page has no words yet.</p><Button asChild className="justify-self-center"><Link to="/flashcards">Finish</Link></Button></CardContent></Card>
      ) : null}

      {sessionQuery.data && currentCard ? (
        <section className="mx-auto grid w-full max-w-3xl gap-5">
          <div className="flex items-end justify-between gap-4"><div><p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Vocabulary page</p><h2 className="m-0 mt-1 text-2xl font-semibold tracking-[-0.02em]">{sessionQuery.data.pageName}</h2></div><div className="text-right"><p className="m-0 text-xs text-muted-foreground">Flashcard</p><strong className="text-lg">{progressLabel}</strong></div></div>
          <progress className="h-1.5 w-full overflow-hidden rounded-full accent-primary" value={currentIndex + 1} max={Math.max(cards.length, 1)} />
          <p className="m-0 text-sm text-muted-foreground">Click the card to flip between prompt and answer.</p>

          <button
            className="grid min-h-[360px] w-full place-items-center rounded-xl border border-border bg-card p-8 text-left shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={() => setFlipped((value) => !value)}
            data-testid="flashcard-stage"
          >
            {!flipped ? (
              <div className="grid w-full max-w-xl gap-4 text-center">
                <span className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">{currentCard.wordClass}</span>
                <h3 className="m-0 text-4xl font-semibold tracking-[-0.03em] text-foreground">{currentCard.word}</h3>
                {currentCard.meaningEn ? <p className="m-0 text-lg text-muted-foreground">{currentCard.meaningEn}</p> : null}
                <small className="mt-8 flex items-center justify-center gap-2 text-muted-foreground"><RotateCw size={14} /> Click to flip</small>
              </div>
            ) : (
              <div className="grid w-full gap-5"><div><span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Vietnamese</span><strong className="mt-1 block text-xl">{currentCard.meaningVn}</strong></div><div><span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{secondaryMeaningLabel}</span><p className="m-0 mt-1 text-base text-foreground">{currentCard.meaningEn}</p></div><div><span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Example</span><p className="m-0 mt-1 text-base leading-6 text-foreground">{currentCard.example}</p></div>
                {currentCard.thesaurus ? (
                  <div><span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Thesaurus</span><p className="m-0 mt-1 text-base text-foreground">{currentCard.thesaurus}</p></div>
                ) : null}
                <small className="mt-2 flex items-center gap-2 text-muted-foreground"><RotateCw size={14} /> Click to flip</small>
              </div>
            )}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" type="button" onClick={goPrevious} disabled={currentIndex === 0}><ChevronLeft /> Previous</Button>
            {isFinalCard ? (
              <div className="flex gap-2"><Button asChild variant="outline"><Link to="/flashcards">Finish</Link></Button><Button asChild><Link to={`/practice?deck=${pageId}`}>Let's practice</Link></Button></div>
            ) : (
              <Button type="button" onClick={goNext}>Next <ChevronRight /></Button>
            )}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}
