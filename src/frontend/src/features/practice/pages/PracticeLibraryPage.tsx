import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { LearningDeckLibrary, listBoards, type FlashcardBoard, type FlashcardPage, useFlashcardSync } from '@/features/flashcards'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PracticeLaunchDialog } from '../components/PracticeLaunchDialog'

export function PracticeLibraryPage() {
  useFlashcardSync()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: listBoards, refetchInterval: 1500 })
  const boardGroups = useMemo<FlashcardBoard[]>(() => decksQuery.data ?? [], [decksQuery.data])
  const requestedDeckId = searchParams.get('deck')
  const selectedPracticeDeck = useMemo<FlashcardPage | null>(() => {
    if (!requestedDeckId) return null
    return boardGroups.flatMap((board) => board.pages).find((page) => page.pageId === requestedDeckId && page.words.length > 0) ?? null
  }, [boardGroups, requestedDeckId])

  useEffect(() => {
    if (decksQuery.isSuccess && requestedDeckId && !selectedPracticeDeck) setSearchParams({}, { replace: true })
  }, [decksQuery.isSuccess, requestedDeckId, selectedPracticeDeck, setSearchParams])

  return (
    <>
      <div className="grid gap-5">
        {decksQuery.isLoading ? <div className="grid gap-4" aria-busy="true" aria-label="Loading flashcards">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div> : null}
        {decksQuery.isError ? <Card className="border-destructive/40"><CardContent className="p-5"><p role="alert" className="m-0 text-sm text-destructive">Unable to load flashcards. Try again when your connection is available.</p></CardContent></Card> : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><BookOpen /></span><div><h2 className="m-0 text-lg font-semibold">No decks yet</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create a vocabulary board and page, then add words to see learning decks here.</p></div></CardContent></Card> : null}
        {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length > 0 ? <LearningDeckLibrary boards={boardGroups} mode="practice" onSelectPracticeDeck={(page) => setSearchParams({ deck: page.pageId })} /> : null}
      </div>
      <PracticeLaunchDialog page={selectedPracticeDeck} onClose={() => setSearchParams({}, { replace: true })} onStart={(pageId, order) => navigate(`/practice/${pageId}?order=${order}`)} />
    </>
  )
}
