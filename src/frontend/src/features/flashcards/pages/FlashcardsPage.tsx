import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import * as flashcardApi from '../api/flashcard.api'
import { LearningDeckLibrary } from '../components/LearningDeckLibrary'
import { useFlashcardSync } from '../hooks/useFlashcardSync'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

export function FlashcardsPage() {
  useFlashcardSync()
  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: flashcardApi.listBoards, refetchInterval: 1500 })
  const boardGroups = useMemo(() => decksQuery.data ?? [], [decksQuery.data])

  return (
    <AppShell title="Flashcards">
      <div className="grid gap-5">
        {decksQuery.isLoading ? <div className="grid gap-4" aria-busy="true" aria-label="Loading flashcards">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div> : null}
        {decksQuery.isError ? <Card className="border-destructive/40"><CardContent className="p-5"><p role="alert" className="m-0 text-sm text-destructive">Unable to load flashcards. Try again when your connection is available.</p></CardContent></Card> : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? (
          <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><BookOpen /></span><div><h2 className="m-0 text-lg font-semibold">No decks yet</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create a vocabulary board and page, then add words to see learning decks here.</p></div></CardContent></Card>
        ) : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length > 0 ? <LearningDeckLibrary boards={boardGroups} mode="flashcards" /> : null}
      </div>
    </AppShell>
  )
}
