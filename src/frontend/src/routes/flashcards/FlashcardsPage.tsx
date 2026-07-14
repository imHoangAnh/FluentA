import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardBoard, FlashcardPage } from '../../lib/api/flashcard.api'
import { useFlashcardSync } from '../../lib/realtime/useFlashcardSync'
import { AppShell } from '@/shared/components/layout/AppShell'
import { LearningDeckLibrary } from '@/components/flashcards/LearningDeckLibrary'
import { PracticeLaunchDialog } from '@/components/flashcards/PracticeLaunchDialog'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

type FlashcardsPageProps = { entryMode?: 'flashcards' | 'practice' }

export function FlashcardsPage({ entryMode = 'flashcards' }: FlashcardsPageProps) {
  useFlashcardSync()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: flashcardApi.listBoards, refetchInterval: 1500 })
  const boardGroups = useMemo<FlashcardBoard[]>(() => decksQuery.data ?? [], [decksQuery.data])
  const requestedDeckId = entryMode === 'practice' ? searchParams.get('deck') : null
  const selectedPracticeDeck = useMemo<FlashcardPage | null>(() => {
    if (!requestedDeckId) return null
    return boardGroups.flatMap((board) => board.pages).find((page) => page.pageId === requestedDeckId && page.words.length > 0) ?? null
  }, [boardGroups, requestedDeckId])

  useEffect(() => {
    if (entryMode === 'practice' && decksQuery.isSuccess && requestedDeckId && !selectedPracticeDeck) {
      setSearchParams({}, { replace: true })
    }
  }, [decksQuery.isSuccess, entryMode, requestedDeckId, selectedPracticeDeck, setSearchParams])

  function openPracticeDeck(page: FlashcardPage) {
    setSearchParams({ deck: page.pageId })
  }

  function closePracticeDialog() {
    setSearchParams({}, { replace: true })
  }

  function startPractice(pageId: string, order: 'sequential' | 'shuffle') {
    navigate(`/practice/${pageId}?order=${order}`)
  }

  return (
    <AppShell title={entryMode === 'practice' ? 'Practice' : 'Flashcards'}>
      <div className="grid gap-5">
        {decksQuery.isLoading ? <div className="grid gap-4" aria-busy="true" aria-label="Loading flashcards">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div> : null}
        {decksQuery.isError ? <Card className="border-destructive/40"><CardContent className="p-5"><p role="alert" className="m-0 text-sm text-destructive">Unable to load flashcards. Try again when your connection is available.</p></CardContent></Card> : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? (
          <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><BookOpen /></span><div><h2 className="m-0 text-lg font-semibold">No decks yet</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create a vocabulary board and page, then add words to see learning decks here.</p></div></CardContent></Card>
        ) : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length > 0 ? <LearningDeckLibrary boards={boardGroups} mode={entryMode} onSelectPracticeDeck={entryMode === 'practice' ? openPracticeDeck : undefined} /> : null}
      </div>

      {entryMode === 'practice' ? <PracticeLaunchDialog page={selectedPracticeDeck} onClose={closePracticeDialog} onStart={startPractice} /> : null}
    </AppShell>
  )
}
