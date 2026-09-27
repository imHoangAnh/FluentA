import { BookOpenText, FileText, FolderPlus, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { useAuthStore } from '@/features/auth'
import { CreateBoardDialog, CreatePageDialog, UpdateBoardDialog } from '../components/CreateVocabularyDialog'
import { VocabTable } from '../components/VocabTable'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { Input } from '@/shared/components/ui/input'
import { toast } from '@/shared/lib/toast'
import * as vocabularyApi from '../api/vocabulary.api'
import { vocabularyKeys } from '../api/vocabulary.queries'
import { cn } from '@/shared/lib/utils'
import { restoreTrashEntry } from '@/features/trash'

type DeleteTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

type BoardUpdateTarget = {
  boardId: string
  name: string
  language: string
  includedOptionalColumns: string[]
}

type RenameTarget = { boardId: string; pageId: string; name: string }

const boardSelectionStorageKey = 'fluenta:vocabulary:selected-board'
const pageSelectionStorageKey = 'fluenta:vocabulary:selected-page'

function readSessionSelection(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionSelection(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value) window.sessionStorage.setItem(key, value)
    else window.sessionStorage.removeItem(key)
  } catch {
    // Selection persistence is optional; keep the vocabulary workspace usable if storage is unavailable.
  }
}

function vocabularySnapshotKey(userId: string, section: 'boards' | 'board' | 'words', id?: string) {
  return `fluenta:vocabulary:snapshot:${userId}:${section}${id ? `:${id}` : ''}`
}

function readSessionSnapshot<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const serialized = window.sessionStorage.getItem(key)
    if (!serialized) return undefined
    const value: unknown = JSON.parse(serialized)
    return isValid(value) ? value : undefined
  } catch {
    return undefined
  }
}

function writeSessionSnapshot(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Snapshot persistence is optional; keep the vocabulary workspace usable if storage is unavailable.
  }
}

function isBoardSummary(value: unknown): value is vocabularyApi.BoardSummary {
  return typeof value === 'object' && value !== null
    && typeof (value as vocabularyApi.BoardSummary).id === 'string'
    && typeof (value as vocabularyApi.BoardSummary).name === 'string'
    && typeof (value as vocabularyApi.BoardSummary).createdAt === 'string'
}

function isBoardSummaries(value: unknown): value is vocabularyApi.BoardSummary[] {
  return Array.isArray(value) && value.every(isBoardSummary)
}

function isBoardDetail(value: unknown): value is vocabularyApi.BoardDetail {
  if (!isBoardSummary(value)) return false
  const detail = value as vocabularyApi.BoardDetail
  return Array.isArray(detail.pages)
    && detail.pages.every((page) => typeof page?.id === 'string' && typeof page.name === 'string')
    && Array.isArray(detail.preferences?.hiddenColumns)
    && Array.isArray(detail.preferences?.columnOrder)
    && typeof detail.preferences?.columnWidths === 'object'
    && detail.preferences.columnWidths !== null
}

function isWords(value: unknown): value is vocabularyApi.Word[] {
  return Array.isArray(value)
    && value.every((word) => typeof word?.id === 'string' && typeof word.pageId === 'string' && typeof word.word === 'string')
}

function newestFirst<T extends { createdAt: string; id: string }>(items: T[]) {
  return items.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
}

function focusHorizontalTab<T extends { id: string }>(
  event: KeyboardEvent<HTMLButtonElement>,
  items: T[],
  currentId: string,
  idPrefix: string,
  onSelect: (id: string) => void,
) {
  if (items.length === 0) return

  const currentIndex = items.findIndex((item) => item.id === currentId)
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? items.length - 1
      : event.key === 'ArrowRight'
        ? (currentIndex + 1) % items.length
        : event.key === 'ArrowLeft'
          ? (currentIndex - 1 + items.length) % items.length
          : -1

  if (nextIndex < 0) return

  event.preventDefault()
  const nextId = items[nextIndex].id
  onSelect(nextId)
  requestAnimationFrame(() => document.getElementById(`${idPrefix}-${nextId}`)?.focus())
}

export function WorkspacePage() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => readSessionSelection(boardSelectionStorageKey))
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => readSessionSelection(pageSelectionStorageKey))
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [boardUpdateTarget, setBoardUpdateTarget] = useState<BoardUpdateTarget | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [boardSearch, setBoardSearch] = useState('')
  const [pageSearch, setPageSearch] = useState('')
  const [wordSearch, setWordSearch] = useState('')
  const boardRowRef = useRef<HTMLDivElement>(null)
  const boardScrollRef = useRef<HTMLDivElement>(null)
  const pageRowRef = useRef<HTMLDivElement>(null)
  const pageScrollRef = useRef<HTMLDivElement>(null)

  const boardsQuery = useQuery({
    queryKey: vocabularyKeys.boards,
    queryFn: vocabularyApi.listBoards,
    initialData: () => userId
      ? readSessionSnapshot(vocabularySnapshotKey(userId, 'boards'), isBoardSummaries)
      : undefined,
  })
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data])
  const sortedBoards = useMemo(
    () => newestFirst(boards),
    [boards],
  )
  const activeBoardId = sortedBoards.some((board) => board.id === selectedBoardId) ? selectedBoardId : sortedBoards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: vocabularyKeys.board(activeBoardId),
    queryFn: () => vocabularyApi.getBoard(activeBoardId!),
    enabled: Boolean(activeBoardId),
    initialData: () => userId && activeBoardId
      ? readSessionSnapshot(vocabularySnapshotKey(userId, 'board', activeBoardId), isBoardDetail)
      : undefined,
  })

  const activeBoard = boardQuery.data
  const sortedPages = useMemo(
    () => newestFirst(activeBoard?.pages ?? []),
    [activeBoard?.pages],
  )
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  useEffect(() => {
    if (!boardsQuery.isSuccess) return
    writeSessionSelection(boardSelectionStorageKey, activeBoardId)
  }, [activeBoardId, boardsQuery.isSuccess])

  useEffect(() => {
    if (!boardQuery.isSuccess) return
    writeSessionSelection(pageSelectionStorageKey, activePage?.id ?? null)
  }, [activePage?.id, boardQuery.isSuccess])

  const activeWordsQuery = useQuery({
    queryKey: vocabularyKeys.words(activePage?.id ?? 'none'),
    queryFn: () => vocabularyApi.listWords(activeBoardId!, activePage!.id),
    enabled: Boolean(activeBoardId && activePage),
    initialData: () => userId && activePage
      ? readSessionSnapshot(vocabularySnapshotKey(userId, 'words', activePage.id), isWords)
      : undefined,
  })

  useEffect(() => {
    if (userId && boardsQuery.data) {
      writeSessionSnapshot(vocabularySnapshotKey(userId, 'boards'), boardsQuery.data)
    }
  }, [boardsQuery.data, userId])

  useEffect(() => {
    if (userId && activeBoard) {
      writeSessionSnapshot(vocabularySnapshotKey(userId, 'board', activeBoard.id), activeBoard)
    }
  }, [activeBoard, userId])

  useEffect(() => {
    if (userId && activePage && activeWordsQuery.data) {
      writeSessionSnapshot(vocabularySnapshotKey(userId, 'words', activePage.id), activeWordsQuery.data)
    }
  }, [activePage, activeWordsQuery.data, userId])

  const visibleBoards = useMemo(() => {
    const term = boardSearch.trim().toLocaleLowerCase()
    return term ? sortedBoards.filter((board) => board.name.toLocaleLowerCase().includes(term)) : sortedBoards
  }, [boardSearch, sortedBoards])

  const visiblePages = useMemo(() => {
    const term = pageSearch.trim().toLocaleLowerCase()
    return term ? sortedPages.filter((page) => page.name.toLocaleLowerCase().includes(term)) : sortedPages
  }, [pageSearch, sortedPages])

  useEffect(() => {
    const wheelTargets = [
      [boardRowRef.current, boardScrollRef.current],
      [pageRowRef.current, pageScrollRef.current],
    ] as const
    const cleanups = wheelTargets.flatMap(([row, scroller]) => {
      if (!row || !scroller) return []

      const handleWheel = (event: WheelEvent) => {
        if (event.deltaY === 0) return

        const previousScrollLeft = scroller.scrollLeft
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth
        scroller.scrollLeft = Math.max(0, Math.min(maxScrollLeft, previousScrollLeft + event.deltaY))
        if (scroller.scrollLeft !== previousScrollLeft) event.preventDefault()
      }

      row.addEventListener('wheel', handleWheel, { passive: false })
      return [() => row.removeEventListener('wheel', handleWheel)]
    })

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [activeBoard?.id])

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      queryClient.setQueryData(vocabularyKeys.board(board.id), board)
      setSelectedBoardId(board.id)
      setSelectedPageId(null)
      setWordSearch('')
      setIsCreatingBoard(false)
      toast.success('Board created successfully')
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page) => {
      setSelectedPageId(page.id)
      setIsCreatingPage(false)
      toast.success('Page created successfully')
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.board(activeBoardId) })
    },
  })

  const updatePreferences = useMutation({
    mutationFn: (input: vocabularyApi.BoardPreferences) => vocabularyApi.updateBoardPreferences(activeBoardId!, {
      hiddenColumns: input.hiddenColumns,
      columnOrder: input.columnOrder,
      columnWidths: input.columnWidths,
    }),
    onSuccess: (preferences) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(vocabularyKeys.board(activeBoardId), (current) => current ? { ...current, preferences } : current)
    },
  })

  const updateBoard = useMutation({
    mutationFn: (input: { target: BoardUpdateTarget; name: string; language: string; includedOptionalColumns: string[] }) =>
      vocabularyApi.updateBoard(input.target.boardId, {
        name: input.name,
        language: input.language,
        includedOptionalColumns: input.includedOptionalColumns,
      }),
    onSuccess: (board) => {
      queryClient.setQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards, (current = []) =>
        current.map((item) => item.id === board.id
          ? { ...item, name: board.name, language: board.language, updatedAt: board.updatedAt }
          : item),
      )
      queryClient.setQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(board.id), board)
      setBoardUpdateTarget(null)
      toast.success('Board updated successfully')
    },
  })

  const renamePage = useMutation({
    mutationFn: (input: { target: RenameTarget; name: string }) =>
      vocabularyApi.updatePage(input.target.boardId, input.target.pageId, { name: input.name }),
    onSuccess: (page, input) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(vocabularyKeys.board(input.target.boardId), (board) => board
        ? { ...board, pages: board.pages.map((item) => item.id === page.id ? page : item) }
        : board)
      setRenameTarget(null)
      toast.success('Page renamed successfully')
    },
  })

  const deleteBoard = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'board' }>) => vocabularyApi.deleteBoard(target.boardId),
    onSuccess: (entry, target) => {
      const remainingBoards = newestFirst((queryClient.getQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards) ?? []).filter((board) => board.id !== target.boardId))
      const deletedBoard = queryClient.getQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(target.boardId))
      queryClient.setQueryData(vocabularyKeys.boards, remainingBoards)
      queryClient.removeQueries({ queryKey: vocabularyKeys.board(target.boardId), exact: true })
      for (const page of deletedBoard?.pages ?? []) queryClient.removeQueries({ queryKey: vocabularyKeys.words(page.id), exact: true })
      setSelectedBoardId(remainingBoards[0]?.id ?? null)
      setSelectedPageId(null)
      requestAnimationFrame(() => document.getElementById(remainingBoards[0] ? `vocabulary-board-tab-${remainingBoards[0].id}` : 'vocabulary-add-board')?.focus())
      toast.success('Board moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id) } })
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
    },
  })

  const deletePage = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'page' }>) => vocabularyApi.deletePage(target.boardId, target.pageId),
    onSuccess: (entry, target) => {
      const boardKey = vocabularyKeys.board(target.boardId)
      const current = queryClient.getQueryData<vocabularyApi.BoardDetail>(boardKey)
      const remainingPages = newestFirst((current?.pages ?? []).filter((page) => page.id !== target.pageId))
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(boardKey, (board) => board ? { ...board, pages: remainingPages } : board)
      queryClient.removeQueries({ queryKey: vocabularyKeys.words(target.pageId), exact: true })
      setSelectedPageId(remainingPages[0]?.id ?? null)
      requestAnimationFrame(() => document.getElementById(remainingPages[0] ? `vocabulary-page-tab-${remainingPages[0].id}` : 'vocabulary-add-page')?.focus())
      toast.success('Page moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id) } })
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
      void queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId)
    setSelectedPageId(null)
    setIsCreatingPage(false)
    setPageSearch('')
    setWordSearch('')
  }

  function selectPage(pageId: string) {
    setSelectedPageId(pageId)
    setWordSearch('')
  }

  function openCreateBoardDialog() {
    createBoard.reset()
    setIsCreatingBoard(true)
  }

  async function openUpdateBoardDialog(board: vocabularyApi.BoardSummary) {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: vocabularyKeys.board(board.id),
        queryFn: () => vocabularyApi.getBoard(board.id),
        staleTime: 0,
      })
      setBoardUpdateTarget({
        boardId: detail.id,
        name: detail.name,
        language: detail.language,
        includedOptionalColumns: vocabularyApi.OPTIONAL_VOCAB_COLUMNS
          .filter(({ key }) => !detail.preferences.hiddenColumns.includes(key))
          .map(({ key }) => key),
      })
    } catch {
      toast.error('Could not load this board right now.')
    }
  }

  function openCreatePageDialog() {
    createPage.reset()
    setIsCreatingPage(true)
  }

  function undo(entryId: string) {
    void restoreTrashEntry(entryId)
      .then(() => queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards }))
      .then(() => toast.success('Vocabulary item restored.'))
      .catch(() => toast.error('Could not restore the vocabulary item.'))
  }

  function confirmRename(name: string) {
    if (!renameTarget) return
    renamePage.mutate({ target: renameTarget, name })
  }

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <Card className="shrink-0 border-border bg-card px-3.5 py-1.5 sm:px-4 sm:py-2" data-testid="vocabulary-board-section">
            <div ref={boardRowRef} className="flex min-w-0 items-center gap-2">
              <Button id="vocabulary-add-board" type="button" variant="outline" size="sm" className="h-8 w-20 shrink-0 justify-center rounded-full px-3" aria-label="New board" onClick={openCreateBoardDialog}>
                <Plus className="size-3.5" /> New
              </Button>
              <div className="relative w-36 shrink-0 sm:w-44">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="vocabulary-board-search"
                  aria-label="Filter boards"
                  className="h-8 rounded-full pl-8 text-xs"
                  placeholder="Find a board..."
                  value={boardSearch}
                  onChange={(event) => setBoardSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setBoardSearch('')
                  }}
                />
              </div>
              <div ref={boardScrollRef} role="tablist" aria-label="Vocabulary boards" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="vocabulary-board-scroll">
                {visibleBoards.map((board) => (
                  <ContextMenu key={board.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        id={`vocabulary-board-tab-${board.id}`}
                        type="button"
                        role="tab"
                        aria-selected={activeBoardId === board.id}
                        tabIndex={activeBoardId === board.id ? 0 : -1}
                        title={board.name}
                        className={cn(
                          'h-8 max-w-44 shrink-0 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                          activeBoardId === board.id && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                        )}
                        onClick={() => selectBoard(board.id)}
                        onKeyDown={(event) => focusHorizontalTab(event, visibleBoards, board.id, 'vocabulary-board-tab', selectBoard)}
                      >
                        <span className="block max-w-36 truncate">{board.name}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => { void openUpdateBoardDialog(board) }}>Update Board</ContextMenuItem>
                      <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteBoard.mutate({ kind: 'board', boardId: board.id, name: board.name })}>Delete Board</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
                {boardsQuery.isSuccess && visibleBoards.length === 0 ? <span className="px-2 text-xs text-muted-foreground">No boards found</span> : null}
              </div>
            </div>

          </Card>

          {activeBoard ? (
            <Card className="shrink-0 border-border bg-card px-3.5 py-1.5 sm:px-4 sm:py-2" data-testid="vocabulary-page-section">
                <div ref={pageRowRef} className="flex min-w-0 items-center gap-2">
                  <Button id="vocabulary-add-page" type="button" variant="outline" size="sm" className="h-8 w-20 shrink-0 justify-center rounded-full px-3" aria-label="New page" onClick={openCreatePageDialog}>
                    <Plus className="size-3.5" /> New
                  </Button>
                  <div className="relative w-36 shrink-0 sm:w-44">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="vocabulary-page-search"
                      aria-label="Filter pages"
                      className="h-8 rounded-full pl-8 text-xs"
                      placeholder="Find a page..."
                      value={pageSearch}
                      onChange={(event) => setPageSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setPageSearch('')
                      }}
                    />
                  </div>
                  <div ref={pageScrollRef} role="tablist" aria-label={`${activeBoard.name} pages`} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="vocabulary-page-scroll">
                    {visiblePages.map((page) => (
                      <ContextMenu key={page.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            id={`vocabulary-page-tab-${page.id}`}
                            type="button"
                            role="tab"
                            aria-selected={activePage?.id === page.id}
                            tabIndex={activePage?.id === page.id ? 0 : -1}
                            title={page.name}
                            className={cn(
                              'h-8 max-w-44 shrink-0 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                              activePage?.id === page.id && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                            )}
                            onClick={() => selectPage(page.id)}
                            onKeyDown={(event) => focusHorizontalTab(event, visiblePages, page.id, 'vocabulary-page-tab', selectPage)}
                          >
                            <span className="block max-w-36 truncate">{page.name}</span>
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onSelect={() => setRenameTarget({ boardId: activeBoard.id, pageId: page.id, name: page.name })}>Update Page</ContextMenuItem>
                          <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deletePage.mutate({ kind: 'page', boardId: activeBoard.id, pageId: page.id, name: page.name })}>Delete Page</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                    {!boardQuery.isLoading && visiblePages.length === 0 ? <span className="px-2 text-xs text-muted-foreground">No pages found</span> : null}
                  </div>
                </div>
            </Card>
          ) : null}

          {activeBoard ? (
            <Card className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border bg-card px-3.5 py-1.5 sm:px-4 sm:py-2" data-testid="vocabulary-toolbar">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <h2 className="m-0 max-w-full truncate text-lg font-semibold tracking-[-0.02em] sm:text-xl">{activePage?.name ?? 'Create your first page'}</h2>
                    {activePage ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{activeWordsQuery.data?.length ?? 0} Words</span> : null}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    {activePage ? (
                      <div className="relative min-w-0 w-44 sm:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          aria-label="Search vocabulary"
                          className="h-9 rounded-full pl-8 text-xs"
                          placeholder="Search vocabulary..."
                          value={wordSearch}
                          onChange={(event) => setWordSearch(event.target.value)}
                        />
                        {wordSearch ? (
                          <button type="button" aria-label="Clear vocabulary search" className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent" onClick={() => setWordSearch('')}>
                            <X className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
            </Card>
          ) : null}

          {activeBoard && activePage && activeWordsQuery.isLoading ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="status" data-testid="vocabulary-loading-state">
              <p className="m-0 text-sm text-muted-foreground">Loading vocabulary...</p>
            </Card>
          ) : activeBoard && activePage && activeWordsQuery.isError && !activeWordsQuery.data ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="alert">
              <h2 className="m-0 text-lg font-semibold">Could not load this page&apos;s vocabulary</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button className="mx-auto mt-5" onClick={() => { void activeWordsQuery.refetch() }}>Retry</Button>
            </Card>
          ) : activeBoard && activePage ? (
            <VocabTable
              key={`${activeBoard.id}:${activeBoard.preferences.updatedAt ?? 'default'}`}
              boardId={activeBoard.id}
              page={activePage}
              preferences={activeBoard.preferences}
              searchTerm={wordSearch}
              onPreferencesChange={async (preferences) => { await updatePreferences.mutateAsync(preferences) }}
            />
          ) : activeBoard ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center">
              <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h2 className="m-0 text-lg font-semibold">This board has no pages</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then add your first vocabulary row.</p>
              <Button className="mx-auto mt-5" onClick={openCreatePageDialog}><Plus /> Create page</Button>
            </Card>
          ) : boardsQuery.isLoading && boards.length === 0 ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="status" data-testid="vocabulary-loading-state">
              <p className="m-0 text-sm text-muted-foreground">Loading your vocabulary boards...</p>
            </Card>
          ) : boardsQuery.isError && boards.length === 0 ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="alert">
              <h2 className="m-0 text-lg font-semibold">Could not load your vocabulary boards</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button className="mx-auto mt-5" onClick={() => { void boardsQuery.refetch() }}>Retry</Button>
            </Card>
          ) : activeBoardId && boardQuery.isLoading ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="status" data-testid="vocabulary-loading-state">
              <p className="m-0 text-sm text-muted-foreground">Loading your vocabulary board...</p>
            </Card>
          ) : activeBoardId && boardQuery.isError ? (
            <Card className="grid min-h-0 flex-1 place-content-center text-center" role="alert">
              <h2 className="m-0 text-lg font-semibold">Could not load this vocabulary board</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button className="mx-auto mt-5" onClick={() => { void boardQuery.refetch() }}>Retry</Button>
            </Card>
          ) : (
            <Card className="grid min-h-0 flex-1 place-content-center text-center">
              <BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h2 className="m-0 text-xl font-semibold">Select or create a vocabulary board</h2>
              <p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Boards keep related pages and learning material together.</p>
              <Button className="mx-auto mt-5" onClick={openCreateBoardDialog}><FolderPlus /> Create board</Button>
            </Card>
          )}
        </section>
      </div>
      {isCreatingBoard ? (
        <CreateBoardDialog
          pending={createBoard.isPending}
          error={createBoard.isError ? 'Could not create the board right now.' : null}
          onOpenChange={(open) => { if (!open) { setIsCreatingBoard(false); createBoard.reset() } }}
          onConfirm={(name, language, includedOptionalColumns) => createBoard.mutate({ name, language, includedOptionalColumns })}
        />
      ) : null}
      {isCreatingPage && activeBoard ? (
        <CreatePageDialog
          boardName={activeBoard.name}
          pending={createPage.isPending}
          error={createPage.isError ? 'Could not create the page right now.' : null}
          onOpenChange={(open) => { if (!open) { setIsCreatingPage(false); createPage.reset() } }}
          onConfirm={(name) => createPage.mutate({ boardId: activeBoard.id, name })}
        />
      ) : null}
      {boardUpdateTarget ? (
        <UpdateBoardDialog
          key={boardUpdateTarget.boardId}
          initialName={boardUpdateTarget.name}
          initialLanguage={boardUpdateTarget.language}
          initialIncludedOptionalColumns={boardUpdateTarget.includedOptionalColumns}
          pending={updateBoard.isPending}
          error={updateBoard.isError ? 'Could not update the board right now.' : null}
          onOpenChange={(open) => { if (!open) { setBoardUpdateTarget(null); updateBoard.reset() } }}
          onConfirm={(name, language, includedOptionalColumns) => updateBoard.mutate({ target: boardUpdateTarget, name, language, includedOptionalColumns })}
        />
      ) : null}
      {renameTarget ? (
        <RenameEntityDialog
          key={renameTarget.pageId}
          entity="Page"
          initialName={renameTarget.name}
          maxLength={120}
          pending={renamePage.isPending}
          error={renamePage.isError ? 'Could not rename this page right now.' : null}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          onConfirm={confirmRename}
        />
      ) : null}
    </>
  )
}
