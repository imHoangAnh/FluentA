import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FlashcardBoard, FlashcardPage } from '../api/flashcard.api'
import { Card, CardContent } from '@/shared/components/ui/card'

type LearningDeckLibraryProps = {
  boards: FlashcardBoard[]
  mode: 'flashcards' | 'practice'
  onSelectPracticeDeck?: (page: FlashcardPage) => void
}

export function LearningDeckLibrary({ boards, mode, onSelectPracticeDeck }: LearningDeckLibraryProps) {
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(() => new Set())
  const initializedExpansionRef = useRef(false)

  useEffect(() => {
    if (!initializedExpansionRef.current && boards[0]) {
      initializedExpansionRef.current = true
      setExpandedBoards(new Set([boards[0].boardId]))
    }
  }, [boards])

  const toggleBoard = useCallback((boardId: string) => {
    setExpandedBoards((current) => {
      const next = new Set(current)
      if (next.has(boardId)) next.delete(boardId)
      else next.add(boardId)
      return next
    })
  }, [])

  return (
    <div className="grid gap-4">
      {boards.map((board) => {
        const expanded = expandedBoards.has(board.boardId)
        const deckCount = board.pages.length

        return (
          <Card key={board.boardId} className="overflow-hidden">
            <button
              className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              type="button"
              onClick={() => toggleBoard(board.boardId)}
              aria-expanded={expanded}
            >
              <span className="min-w-0 truncate text-base font-semibold tracking-[-0.01em] text-foreground">{board.boardName}</span>
              <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                <span>{deckCount} {deckCount === 1 ? 'deck' : 'decks'}</span>
                {expanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
              </span>
            </button>

            {expanded ? (
              <CardContent className="p-4 sm:p-5">
                {deckCount === 0 ? <p className="m-0 text-sm text-muted-foreground">No decks in this board yet.</p> : (
                  <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
                    {board.pages.map((page) => <DeckCard key={page.pageId} mode={mode} page={page} onSelectPracticeDeck={onSelectPracticeDeck} />)}
                  </div>
                )}
              </CardContent>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

function DeckCard({ mode, page, onSelectPracticeDeck }: { mode: LearningDeckLibraryProps['mode']; page: FlashcardPage; onSelectPracticeDeck?: (page: FlashcardPage) => void }) {
  const hasWords = page.words.length > 0
  const content = <><span className="line-clamp-2 break-words text-sm font-semibold leading-5 tracking-[-0.01em]">{page.pageName}</span><span className="text-xs text-muted-foreground">{page.words.length} {page.words.length === 1 ? 'word' : 'words'}</span></>
  const cardClassName = 'flex min-h-24 min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-border bg-card p-2.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  if (!hasWords) {
    return <div data-testid={`flashcard-page-${page.pageId}`} aria-disabled="true" className={`${cardClassName} cursor-not-allowed bg-muted/50 text-muted-foreground`}>{content}</div>
  }

  if (mode === 'flashcards') {
    return <Link data-testid={`flashcard-page-${page.pageId}`} aria-label={`Open flashcards for ${page.pageName}, ${page.words.length} words`} to={`/flashcards/pages/${page.pageId}`} className={`${cardClassName} hover:bg-accent`}>{content}</Link>
  }

  return <button data-testid={`flashcard-page-${page.pageId}`} aria-label={`Practice ${page.pageName}, ${page.words.length} words`} type="button" onClick={() => onSelectPracticeDeck?.(page)} className={`${cardClassName} hover:bg-accent`}>{content}</button>
}
