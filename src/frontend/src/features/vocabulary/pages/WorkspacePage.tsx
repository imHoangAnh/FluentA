import { BookOpenText, ChevronRight, FileText, Filter, FolderPlus, Plus, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { ColumnSettings } from '../components/ColumnSettings'
import { CreateBoardDialog, CreatePageDialog } from '../components/CreateVocabularyDialog'
import { VocabTable } from '../components/VocabTable'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { toast } from '@/shared/lib/toast'
import * as vocabularyApi from '../api/vocabulary.api'
import { vocabularyKeys } from '../api/vocabulary.queries'
import { cn } from '@/shared/lib/utils'
import { restoreTrashEntry } from '@/features/trash'

type DeleteTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

type RenameTarget =
  | { kind: 'board'; boardId: string; name: string; language: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

function newestFirst<T extends { createdAt: string; id: string }>(items: T[]) {
  return items.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
}

export function WorkspacePage() {
  const queryClient = useQueryClient()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const railFocusRef = useRef<HTMLDivElement>(null)

  const boardsQuery = useQuery({ queryKey: vocabularyKeys.boards, queryFn: vocabularyApi.listBoards })
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
  })

  const activeBoard = boardQuery.data
  const sortedPages = useMemo(
    () => newestFirst(activeBoard?.pages ?? []),
    [activeBoard?.pages],
  )
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      setSelectedBoardId(board.id)
      setSelectedPageId(null)
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

  const renameBoard = useMutation({
    mutationFn: (input: { target: Extract<RenameTarget, { kind: 'board' }>; name: string }) =>
      vocabularyApi.updateBoard(input.target.boardId, { name: input.name, language: input.target.language }),
    onSuccess: (board) => {
      queryClient.setQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards, (current = []) =>
        current.map((item) => item.id === board.id ? { ...item, name: board.name, updatedAt: board.updatedAt } : item),
      )
      queryClient.setQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(board.id), board)
      setRenameTarget(null)
      toast.success('Board renamed successfully')
    },
  })

  const renamePage = useMutation({
    mutationFn: (input: { target: Extract<RenameTarget, { kind: 'page' }>; name: string }) =>
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
      requestAnimationFrame(() => railFocusRef.current?.focus())
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
      requestAnimationFrame(() => railFocusRef.current?.focus())
      toast.success('Page moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id) } })
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
      void queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId)
    setSelectedPageId(null)
    setIsCreatingPage(false)
  }

  function openCreateBoardDialog() {
    createBoard.reset()
    setIsCreatingBoard(true)
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
    if (renameTarget.kind === 'board') renameBoard.mutate({ target: renameTarget, name })
    else renamePage.mutate({ target: renameTarget, name })
  }

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)] gap-4 max-lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><h2 className="m-0 text-sm font-semibold">Boards</h2><p className="m-0 mt-0.5 text-xs text-muted-foreground">{boards.length} collections</p></div>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Create new board" onClick={openCreateBoardDialog}><FolderPlus /></Button>
          </div>

          <div ref={railFocusRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-2 outline-none" data-testid="vocabulary-rail-scroll">
            {sortedBoards.map((board) => (
              <div className="mb-1" key={board.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn('flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md border-0 bg-transparent px-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', activeBoardId === board.id && 'bg-secondary text-secondary-foreground')}
                      onClick={() => selectBoard(board.id)}
                      onContextMenu={() => selectBoard(board.id)}
                    >
                      <ChevronRight className={cn('size-4 shrink-0 transition-transform duration-150', activeBoardId === board.id && 'rotate-90')} />
                      <span className="block min-w-0 flex-1 truncate">{board.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{board.pageCount}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">{board.language}</Badge>
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'board', boardId: board.id, name: board.name, language: board.language })}>Rename Board</ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteBoard.mutate({ kind: 'board', boardId: board.id, name: board.name })}>Delete Board</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {activeBoard?.id === board.id ? (
                  <div className="ml-4 mt-1 grid gap-1 border-l border-border pl-2">
                    <Button type="button" variant="ghost" size="sm" className="justify-start px-2 text-primary" onClick={openCreatePageDialog}><Plus /> Add page</Button>
                    {sortedPages.map((page) => (
                      <ContextMenu key={page.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn('flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md border-0 bg-transparent px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent', activePage?.id === page.id && 'bg-accent font-semibold text-accent-foreground')}
                            onClick={() => setSelectedPageId(page.id)}
                            onContextMenu={() => setSelectedPageId(page.id)}
                          >
                            <FileText className="size-3.5 shrink-0" /><span className="block min-w-0 flex-1 truncate">{page.name}</span>
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name })}>Rename Page</ContextMenuItem>
                          <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deletePage.mutate({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name })}>Delete Page</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {boardsQuery.isLoading ? <p className="px-2 text-sm text-muted-foreground">Loading boards...</p> : null}
            {!boardsQuery.isLoading && boards.length === 0 ? <div className="px-3 py-10 text-center"><BookOpenText className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="m-0 text-sm font-medium">No boards yet</p><p className="m-0 mt-1 text-xs leading-5 text-muted-foreground">Create a board to start organizing vocabulary.</p></div> : null}
          </div>
        </Card>

        <section className="flex min-w-0 min-h-0 flex-col">
          {activeBoard ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <Card className="flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3" data-testid="vocabulary-toolbar">
                <div className="min-w-0"><h2 className="m-0 truncate text-xl font-semibold tracking-[-0.02em]">{activePage?.name ?? 'Create your first page'}</h2></div>
                <div className="flex items-center gap-2">
                  <span id="vocabulary-search-coming-soon" className="sr-only">Coming soon</span>
                  <Button variant="outline" size="sm" disabled aria-describedby="vocabulary-search-coming-soon" title="Coming soon"><Search /> Search</Button>
                  <Button variant="outline" size="sm" disabled aria-describedby="vocabulary-search-coming-soon" title="Coming soon"><Filter /> Filter</Button>
                  <ColumnSettings preferences={activeBoard.preferences} onSave={async (preferences) => { await updatePreferences.mutateAsync(preferences) }} />
                </div>
              </Card>

              {activePage ? (
                <VocabTable
                  key={`${activeBoard.id}:${activeBoard.preferences.updatedAt ?? 'default'}`}
                  boardId={activeBoard.id}
                  page={activePage}
                  preferences={activeBoard.preferences}
                  onPreferencesChange={async (preferences) => { await updatePreferences.mutateAsync(preferences) }}
                />
              ) : (
                <Card className="grid min-h-0 flex-1 place-content-center text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="m-0 text-lg font-semibold">This board has no pages</h2><p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then add your first vocabulary row.</p><Button className="mx-auto mt-5" onClick={openCreatePageDialog}><Plus /> Create page</Button></Card>
              )}
            </div>
          ) : (
            <Card className="grid min-h-0 flex-1 place-content-center text-center"><BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground" /><h2 className="m-0 text-xl font-semibold">Select or create a vocabulary board</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Boards keep related pages and learning material together.</p><Button className="mx-auto mt-5" onClick={openCreateBoardDialog}><FolderPlus /> Create board</Button></Card>
          )}
        </section>
      </div>
      {isCreatingBoard ? (
        <CreateBoardDialog
          pending={createBoard.isPending}
          error={createBoard.isError ? 'Could not create the board right now.' : null}
          onOpenChange={(open) => { if (!open) { setIsCreatingBoard(false); createBoard.reset() } }}
          onConfirm={(name, language) => createBoard.mutate({ name, language })}
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
      {renameTarget ? (
        <RenameEntityDialog
          key={`${renameTarget.kind}:${renameTarget.kind === 'board' ? renameTarget.boardId : renameTarget.pageId}`}
          entity={renameTarget.kind === 'board' ? 'Board' : 'Page'}
          initialName={renameTarget.name}
          maxLength={120}
          pending={renameBoard.isPending || renamePage.isPending}
          error={renameBoard.isError || renamePage.isError ? `Could not rename ${renameTarget.kind} right now.` : null}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          onConfirm={confirmRename}
        />
      ) : null}
    </>
  )
}
