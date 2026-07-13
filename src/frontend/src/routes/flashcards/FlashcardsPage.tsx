import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronDown, ChevronUp, Layers, Plus } from 'lucide-react'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardBoard } from '../../lib/api/flashcard.api'
import { useFlashcardSync } from '../../lib/realtime/useFlashcardSync'
import { AppShell } from '@/components/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type FlashcardsPageProps = { entryMode?: 'flashcards' | 'practice' }

export function FlashcardsPage({ entryMode = 'flashcards' }: FlashcardsPageProps) {
  useFlashcardSync()
  const decksQuery = useQuery({ queryKey: ['flashcard', 'boards'], queryFn: flashcardApi.listBoards, refetchInterval: 1500 })
  const boardGroups = useMemo<FlashcardBoard[]>(() => decksQuery.data ?? [], [decksQuery.data])
  const practiceEntry = entryMode === 'practice'
  const [expandedBoards, setExpandedBoards] = useState<Set<string> | null>(null)

  const toggleBoard = useCallback((boardId: string) => {
    setExpandedBoards((previous) => {
      const next = previous !== null ? new Set(previous) : new Set(boardGroups[0] ? [boardGroups[0].boardId] : [])
      if (next.has(boardId)) {
        next.delete(boardId)
      } else {
        next.add(boardId)
      }
      return next
    })
  }, [boardGroups])

  const title = practiceEntry ? 'Choose a page to practice' : 'Your pages'
  return <AppShell title={practiceEntry ? 'Practice' : 'Flashcards'} description={practiceEntry ? 'Choose a page and work through its configured learning modes.' : 'Browse the flashcards generated from your vocabulary pages.'}>
  <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="m-0 text-sm font-medium text-primary">Learning library</p><h2 className="m-0 mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2></div><Button asChild variant="outline"><Link to="/vocabulary"><Plus /> Add vocabulary</Link></Button></div>

      {decksQuery.isLoading ? <div className="grid gap-4" aria-busy="true" aria-label="Loading flashcards">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div> : null}
      {decksQuery.isError ? <Card className="border-destructive/40"><CardContent className="p-5"><p role="alert" className="m-0 text-sm text-destructive">Unable to load flashcards. Try again when your connection is available.</p></CardContent></Card> : null}
      {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><BookOpen /></span><div><h3 className="m-0 text-lg font-semibold">No pages yet</h3><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create a vocabulary board and page, then add words to see live learning content here.</p></div><Button asChild><Link to="/vocabulary">Open vocabulary</Link></Button></CardContent></Card> : null}

      <div className="grid gap-4">{boardGroups.map((board, index) => {
        const expanded = expandedBoards ? expandedBoards.has(board.boardId) : index === 0
        return <Card key={board.boardId} className="overflow-hidden"><button className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" onClick={() => toggleBoard(board.boardId)} aria-expanded={expanded}><span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Layers className="size-5" /></span><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Vocabulary board</span><strong className="block truncate text-base text-foreground">{board.boardName}</strong></span></span><span className="flex shrink-0 items-center gap-3"><Badge variant="outline">{board.pages.length} {board.pages.length === 1 ? 'page' : 'pages'}</Badge>{expanded ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}</span></button>
          {expanded ? <CardContent className="border-t border-border bg-muted/30 p-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{board.pages.map((page) => <Card key={page.pageId} data-testid={`flashcard-page-${page.pageId}`} className="flex min-h-56 flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><div><p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Vocabulary page</p><CardTitle className="mt-1">{page.pageName}</CardTitle></div><Badge variant={page.words.length > 0 ? 'default' : 'outline'}>{page.words.length}</Badge></div>{practiceEntry && page.isPracticed ? <Badge className="w-fit" variant="outline">Practiced</Badge> : null}<CardDescription>{page.words.length > 0 ? `${page.words.length} words are ready in this page.` : 'No words yet.'}</CardDescription></CardHeader><CardContent className="mt-auto flex flex-wrap gap-2">{page.words.length > 0 ? practiceEntry ? <><Button asChild size="sm"><Link to={`/flashcards/pages/${page.pageId}/practice`}>{page.isPracticed ? 'Practice again' : 'Practice'}</Link></Button><Button asChild variant="outline" size="sm"><Link to={`/flashcards/pages/${page.pageId}`}>Open Flashcards</Link></Button></> : <><Button asChild size="sm"><Link to={`/flashcards/pages/${page.pageId}`}>Open Flashcards</Link></Button><Button asChild variant="outline" size="sm"><Link to={`/flashcards/pages/${page.pageId}/practice`}>Practice this Page</Link></Button></> : <><Button size="sm" disabled>Open Flashcards</Button><Button asChild variant="outline" size="sm"><Link to="/vocabulary">Add cards</Link></Button></>}</CardContent></Card>)}</div></CardContent> : null}
        </Card>
      })}</div>
    </div>
  </AppShell>
}
