import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Headphones, Mic, TextSelect } from 'lucide-react'
import { createPracticeSession, getPracticeDecks, type PracticeDeck } from '../api/practice.api'
import { practiceKeys } from '../api/practice.queries'
import { PracticeLaunchDialog } from '../components/PracticeLaunchDialog'
import { listBoards, vocabularyKeys, type BoardSummary } from '@/features/vocabulary'
import { Input } from '@/shared/components/ui/input'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import '../practice-library.css'

const PAGE_SIZE = 20
type PageToken = number | 'ellipsis'

function getPageTokens(totalPages: number, currentPage: number): PageToken[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const visiblePages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((pageNumber) => pageNumber > 0 && pageNumber <= totalPages)
    .sort((first, second) => first - second)

  return visiblePages.flatMap((pageNumber, index) => {
    const previousPage = visiblePages[index - 1]
    if (previousPage === undefined) return [pageNumber]
    if (pageNumber - previousPage === 2) return [previousPage + 1, pageNumber]
    if (pageNumber - previousPage > 2) return ['ellipsis', pageNumber]
    return [pageNumber]
  })
}

function formatWordCount(wordCount: number) {
  return `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`
}

export function PracticeLibraryPage() {
  const navigate = useNavigate()
  const [boardSelection, setBoardSelection] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedDeck, setSelectedDeck] = useState<PracticeDeck | null>(null)

  const boardsQuery = useQuery({ queryKey: vocabularyKeys.boards, queryFn: listBoards })
  const boards: BoardSummary[] = boardsQuery.data ?? []
  const selectedBoardId = boards.some((board) => board.id === boardSelection)
    ? boardSelection
    : boards[0]?.id ?? ''
  const selectedBoard = boards.find((board) => board.id === selectedBoardId)
  const decksQuery = useQuery({
    queryKey: practiceKeys.decks({ boardId: selectedBoardId, search: debouncedSearch, page, pageSize: PAGE_SIZE }),
    queryFn: () => getPracticeDecks({ boardId: selectedBoardId, search: debouncedSearch, page, pageSize: PAGE_SIZE }),
    enabled: Boolean(selectedBoardId) && boardsQuery.isSuccess,
  })
  const startMutation = useMutation({
    mutationFn: createPracticeSession,
    onSuccess: (session) => {
      setSelectedDeck(null)
      navigate(`/practice/${session.sessionId}`)
    },
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const handleBoardChange = (boardId: string) => {
    setBoardSelection(boardId)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const deckPage = decksQuery.data
  const totalPages = deckPage ? Math.ceil(deckPage.totalCount / deckPage.pageSize) : 0
  const currentPage = deckPage?.page ?? page
  const pageTokens = getPageTokens(totalPages, currentPage)
  const rangeStart = deckPage && deckPage.totalCount > 0 ? (deckPage.page - 1) * deckPage.pageSize + 1 : 0
  const rangeEnd = deckPage ? Math.min(deckPage.page * deckPage.pageSize, deckPage.totalCount) : 0

  const startPage = () => {
    if (!selectedDeck || startMutation.isPending) return
    startMutation.mutate({ pageId: selectedDeck.pageId })
  }

  const boardOptions = [
    {
      value: '',
      label: boardsQuery.isLoading ? 'Loading boards…' : boards.length === 0 ? 'No boards available' : 'Select a board',
      disabled: true,
    },
    ...boards.map((board) => ({ value: board.id, label: board.name })),
  ]

  return (
    <div className="practice-library" aria-label="Practice library">
      <section className="practice-library__flow" aria-label="Practice session flow">
        <div className="practice-library__flow-intro">
          <p>A LITTLE PRACTICE, EVERY DAY</p>
          <h2>Learn it. Recall it. Say it.</h2>
        </div>
        <ol className="practice-library__flow-steps">
          <li className="practice-library__flow-step">
            <span className="practice-library__flow-icon"><Headphones size={22} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="practice-library__flow-copy"><span>01</span><strong>Dictation</strong><small>Listen &amp; type</small></span>
          </li>
          <li className="practice-library__flow-step">
            <span className="practice-library__flow-icon"><TextSelect size={22} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="practice-library__flow-copy"><span>02</span><strong>Word to meaning</strong><small>Recall the meaning</small></span>
          </li>
          <li className="practice-library__flow-step">
            <span className="practice-library__flow-icon"><Mic size={22} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="practice-library__flow-copy"><span>03</span><strong>Pronunciation</strong><small>Say it out loud</small></span>
          </li>
        </ol>
      </section>

      <section className="practice-library__toolbar" aria-label="Find a practice deck">
        <SelectMenu
          aria-label="Select vocabulary board"
          className="practice-library__board-select"
          buttonClassName="practice-library__board-select-button"
          optionsClassName="practice-library__board-options"
          value={selectedBoardId}
          onChange={handleBoardChange}
          options={boardOptions}
          disabled={boardsQuery.isLoading || boardsQuery.isError || boards.length === 0}
        />

        <label className="practice-library__search">
          <span className="sr-only">Search decks</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={`Search in ${selectedBoard?.name ?? 'this board'}…`}
            aria-label="Search deck titles"
          />
        </label>
        <p className="practice-library__hint">Choose a deck to begin</p>
      </section>

      {boardsQuery.isError ? (
        <p className="practice-library__message practice-library__message--error" role="alert">
          Unable to load vocabulary boards. Try again when your connection is available.
        </p>
      ) : null}

      {boardsQuery.isSuccess && boards.length === 0 ? (
        <div className="practice-library__message">
          <strong>No boards yet</strong>
          <span>Create a vocabulary board and page, then add words to see practice decks here.</span>
        </div>
      ) : null}

      {decksQuery.isLoading ? (
        <div className="practice-library__deck-grid" aria-busy="true" aria-label="Loading practice decks">
          {Array.from({ length: 10 }, (_, index) => <div className="practice-library__deck-skeleton" key={index} />)}
        </div>
      ) : null}

      {decksQuery.isError ? (
        <p className="practice-library__message practice-library__message--error" role="alert">
          Unable to load practice decks. Try again when your connection is available.
        </p>
      ) : null}

      {decksQuery.isSuccess && deckPage && deckPage.totalCount === 0 ? (
        <div className="practice-library__message">
          <strong>{debouncedSearch ? 'No decks found' : 'No decks yet'}</strong>
          <span>
            {debouncedSearch
              ? `No deck titles match “${debouncedSearch}”. Try another search.`
              : 'Create a vocabulary board and page, then add words to see practice decks here.'}
          </span>
        </div>
      ) : null}

      {decksQuery.isSuccess && deckPage && deckPage.items.length > 0 ? (
        <>
          <div className="practice-library__deck-grid" aria-label="Practice decks">
            {deckPage.items.map((deck) => (
              <article className="practice-library__deck" key={deck.pageId}>
                <h3>{deck.pageName}</h3>
                <p>{formatWordCount(deck.wordCount)}</p>
                <button
                  className="practice-library__deck-action"
                  data-testid={`practice-deck-${deck.pageId}`}
                  type="button"
                  disabled={deck.wordCount === 0}
                  onClick={() => { setSelectedDeck(deck); startMutation.reset() }}
                  aria-label={`Practice ${deck.pageName}, ${formatWordCount(deck.wordCount)}`}
                >
                  Practice
                </button>
              </article>
            ))}
          </div>

          <nav className="practice-library__pagination" aria-label="Practice deck pages">
            <p aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {deckPage.totalCount} ready {deckPage.totalCount === 1 ? 'deck' : 'decks'}
            </p>
            <div className="practice-library__page-controls">
              <button
                className="practice-library__page-button practice-library__page-button--arrow"
                type="button"
                aria-label="Previous page"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || decksQuery.isFetching}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              {pageTokens.map((token, index) => token === 'ellipsis' ? (
                <span className="practice-library__page-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
              ) : (
                <button
                  className={`practice-library__page-button${token === currentPage ? ' is-current' : ''}`}
                  key={token}
                  type="button"
                  aria-label={`Page ${token}`}
                  aria-current={token === currentPage ? 'page' : undefined}
                  onClick={() => setPage(token)}
                  disabled={token === currentPage || decksQuery.isFetching}
                >
                  {token}
                </button>
              ))}
              <button
                className="practice-library__page-button practice-library__page-button--arrow"
                type="button"
                aria-label="Next page"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || decksQuery.isFetching}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </nav>
        </>
      ) : null}

      <PracticeLaunchDialog
        deck={selectedDeck}
        isStarting={startMutation.isPending}
        startError={startMutation.isError}
        onClose={() => { setSelectedDeck(null); startMutation.reset() }}
        onStart={startPage}
      />
    </div>
  )
}
