import { BookOpenText, ChevronRight, FileText, Filter, FolderPlus, Plus, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/shared/components/layout/AppShell'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { ColumnSettings } from '../components/ColumnSettings'
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog'
import { VocabTable } from '../components/VocabTable'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { toast } from '@/lib/toast'
import * as vocabularyApi from '../api/vocabulary.api'
import { supportedLanguageProfiles } from '@/shared/lib/language'
import { cn } from '@/shared/lib/utils'

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
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardLanguage, setNewBoardLanguage] = useState('en')
  const [newPageName, setNewPageName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [restoreDeleteFocus, setRestoreDeleteFocus] = useState(false)
  const railFocusRef = useRef<HTMLDivElement>(null)

  const boardsQuery = useQuery({ queryKey: ['vocab', 'boards'], queryFn: vocabularyApi.listBoards })
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data])
  const sortedBoards = useMemo(
    () => newestFirst(boards),
    [boards],
  )
  const activeBoardId = sortedBoards.some((board) => board.id === selectedBoardId) ? selectedBoardId : sortedBoards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: ['vocab', 'boards', activeBoardId],
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
      setNewBoardName('')
      setNewBoardLanguage('en')
      setIsCreatingBoard(false)
      toast.success('Board created successfully')
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page) => {
      setSelectedPageId(page.id)
      setNewPageName('')
      setIsCreatingPage(false)
      toast.success('Page created successfully')
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards', activeBoardId] })
    },
  })

  const updatePreferences = useMutation({
    mutationFn: (input: vocabularyApi.BoardPreferences) => vocabularyApi.updateBoardPreferences(activeBoardId!, {
      hiddenColumns: input.hiddenColumns,
      columnOrder: input.columnOrder,
      columnWidths: input.columnWidths,
    }),
    onSuccess: (preferences) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(['vocab', 'boards', activeBoardId], (current) => current ? { ...current, preferences } : current)
    },
  })

  const renameBoard = useMutation({
    mutationFn: (input: { target: Extract<RenameTarget, { kind: 'board' }>; name: string }) =>
      vocabularyApi.updateBoard(input.target.boardId, { name: input.name, language: input.target.language }),
    onSuccess: (board) => {
      queryClient.setQueryData<vocabularyApi.BoardSummary[]>(['vocab', 'boards'], (current = []) =>
        current.map((item) => item.id === board.id ? { ...item, name: board.name, updatedAt: board.updatedAt } : item),
      )
      queryClient.setQueryData<vocabularyApi.BoardDetail>(['vocab', 'boards', board.id], board)
      setRenameTarget(null)
      toast.success('Board renamed successfully')
    },
  })

  const renamePage = useMutation({
    mutationFn: (input: { target: Extract<RenameTarget, { kind: 'page' }>; name: string }) =>
      vocabularyApi.updatePage(input.target.boardId, input.target.pageId, { name: input.name }),
    onSuccess: (page, input) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(['vocab', 'boards', input.target.boardId], (board) => board
        ? { ...board, pages: board.pages.map((item) => item.id === page.id ? page : item) }
        : board)
      setRenameTarget(null)
      toast.success('Page renamed successfully')
    },
  })

  const deleteBoard = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'board' }>) => vocabularyApi.deleteBoard(target.boardId),
    onSuccess: (_, target) => {
      const remainingBoards = newestFirst((queryClient.getQueryData<vocabularyApi.BoardSummary[]>(['vocab', 'boards']) ?? []).filter((board) => board.id !== target.boardId))
      const deletedBoard = queryClient.getQueryData<vocabularyApi.BoardDetail>(['vocab', 'boards', target.boardId])
      queryClient.setQueryData(['vocab', 'boards'], remainingBoards)
      queryClient.removeQueries({ queryKey: ['vocab', 'boards', target.boardId], exact: true })
      for (const page of deletedBoard?.pages ?? []) queryClient.removeQueries({ queryKey: ['vocab', 'words', page.id], exact: true })
      setSelectedBoardId(remainingBoards[0]?.id ?? null)
      setSelectedPageId(null)
      setRestoreDeleteFocus(true)
      setDeleteTarget(null)
      requestAnimationFrame(() => railFocusRef.current?.focus())
      toast.success('Board deleted successfully')
      void queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const deletePage = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'page' }>) => vocabularyApi.deletePage(target.boardId, target.pageId),
    onSuccess: (_, target) => {
      const boardKey = ['vocab', 'boards', target.boardId] as const
      const current = queryClient.getQueryData<vocabularyApi.BoardDetail>(boardKey)
      const remainingPages = newestFirst((current?.pages ?? []).filter((page) => page.id !== target.pageId))
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(boardKey, (board) => board ? { ...board, pages: remainingPages } : board)
      queryClient.removeQueries({ queryKey: ['vocab', 'words', target.pageId], exact: true })
      setSelectedPageId(remainingPages[0]?.id ?? null)
      setRestoreDeleteFocus(true)
      setDeleteTarget(null)
      requestAnimationFrame(() => railFocusRef.current?.focus())
      toast.success('Page deleted successfully')
      void queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
      void queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId)
    setSelectedPageId(null)
    setIsCreatingPage(false)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'board') deleteBoard.mutate(deleteTarget)
    else deletePage.mutate(deleteTarget)
  }

  function confirmRename(name: string) {
    if (!renameTarget) return
    if (renameTarget.kind === 'board') renameBoard.mutate({ target: renameTarget, name })
    else renamePage.mutate({ target: renameTarget, name })
  }

  const deletePending = deleteBoard.isPending || deletePage.isPending

  return (
    <AppShell
      title="Vocabulary"
      contentClassName="h-screen max-w-none"
    >
      <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)] gap-4 max-lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><h2 className="m-0 text-sm font-semibold">Boards</h2><p className="m-0 mt-0.5 text-xs text-muted-foreground">{boards.length} collections</p></div>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Create new board" onClick={() => setIsCreatingBoard((value) => !value)}><FolderPlus /></Button>
          </div>

          {isCreatingBoard ? (
            <form
              className="grid gap-3 border-b border-border bg-secondary/30 p-3"
              onSubmit={(event) => {
                event.preventDefault()
                const name = newBoardName.trim()
                if (name) createBoard.mutate({ name, language: newBoardLanguage })
              }}
            >
              <div className="grid gap-1.5"><label className="text-xs font-medium" htmlFor="new-board-name">Board name</label><Input id="new-board-name" data-testid="board-name-input" value={newBoardName} onChange={(event) => setNewBoardName(event.target.value)} maxLength={120} autoFocus required /></div>
              <div className="grid gap-1.5"><label className="text-xs font-medium" htmlFor="new-board-language">Language</label><select id="new-board-language" data-testid="board-language-select" className="h-10 rounded-md border border-input bg-card px-3 text-sm" value={newBoardLanguage} onChange={(event) => setNewBoardLanguage(event.target.value)}>{supportedLanguageProfiles.map((profile) => <option key={profile.code} value={profile.code}>{profile.name}</option>)}</select></div>
              <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setIsCreatingBoard(false)}>Cancel</Button><Button data-testid="create-board-button" type="submit" size="sm" disabled={createBoard.isPending || !newBoardName.trim()}>Create</Button></div>
            </form>
          ) : null}

          <div ref={railFocusRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-2 outline-none" data-testid="vocabulary-rail-scroll">
            {sortedBoards.map((board) => (
              <div className="mb-1" key={board.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn('flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', activeBoardId === board.id && 'bg-secondary text-secondary-foreground')}
                      onClick={() => selectBoard(board.id)}
                      onContextMenu={() => selectBoard(board.id)}
                    >
                      <ChevronRight className={cn('size-4 shrink-0 transition-transform duration-150', activeBoardId === board.id && 'rotate-90')} />
                      <span className="min-w-0 flex-1 truncate">{board.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{board.pageCount}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">{board.language}</Badge>
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'board', boardId: board.id, name: board.name, language: board.language })}>Rename Board</ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => { setRestoreDeleteFocus(false); setDeleteTarget({ kind: 'board', boardId: board.id, name: board.name }) }}>Delete Board</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {activeBoard?.id === board.id ? (
                  <div className="ml-4 mt-1 grid gap-1 border-l border-border pl-2">
                    {sortedPages.map((page) => (
                      <ContextMenu key={page.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn('flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent', activePage?.id === page.id && 'bg-accent font-semibold text-accent-foreground')}
                            onClick={() => setSelectedPageId(page.id)}
                            onContextMenu={() => setSelectedPageId(page.id)}
                          >
                            <FileText className="size-3.5 shrink-0" /><span className="truncate">{page.name}</span>
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name })}>Rename Page</ContextMenuItem>
                          <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => { setRestoreDeleteFocus(false); setDeleteTarget({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name }) }}>Delete Page</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="justify-start px-2 text-primary" onClick={() => setIsCreatingPage(true)}><Plus /> Add page</Button>
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

              {isCreatingPage ? (
                <Card className="shrink-0">
                  <form className="flex items-end gap-3 p-4" onSubmit={(event) => { event.preventDefault(); const name = newPageName.trim(); if (name) createPage.mutate({ boardId: activeBoard.id, name }) }}>
                    <div className="grid flex-1 gap-1.5"><label className="text-xs font-medium" htmlFor="new-page-name">Page name</label><Input id="new-page-name" data-testid="page-name-input" value={newPageName} onChange={(event) => setNewPageName(event.target.value)} autoFocus required /></div>
                    <Button type="button" variant="ghost" onClick={() => setIsCreatingPage(false)}>Cancel</Button>
                    <Button type="submit" data-testid="create-page-button" disabled={!newPageName.trim() || createPage.isPending}>Create page</Button>
                  </form>
                </Card>
              ) : null}

              {activePage ? (
                <VocabTable
                  key={`${activeBoard.id}:${activeBoard.preferences.updatedAt ?? 'default'}`}
                  boardId={activeBoard.id}
                  page={activePage}
                  preferences={activeBoard.preferences}
                  onPreferencesChange={async (preferences) => { await updatePreferences.mutateAsync(preferences) }}
                />
              ) : (
                <Card className="grid min-h-0 flex-1 place-content-center text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="m-0 text-lg font-semibold">This board has no pages</h2><p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then add your first vocabulary row.</p><Button className="mx-auto mt-5" onClick={() => setIsCreatingPage(true)}><Plus /> Create page</Button></Card>
              )}
            </div>
          ) : (
            <Card className="grid min-h-0 flex-1 place-content-center text-center"><BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground" /><h2 className="m-0 text-xl font-semibold">Select or create a vocabulary board</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Boards keep related pages and learning material together.</p><Button className="mx-auto mt-5" onClick={() => setIsCreatingBoard(true)}><FolderPlus /> Create board</Button></Card>
          )}
        </section>
      </div>
      {deleteTarget ? (
        <DeleteConfirmationDialog
          entity={deleteTarget.kind === 'board' ? 'Board' : 'Page'}
          name={deleteTarget.name}
          open
          pending={deletePending}
          restoreFallback={restoreDeleteFocus}
          fallbackRef={railFocusRef}
          onOpenChange={(open) => { if (!open && !deletePending) { setRestoreDeleteFocus(false); setDeleteTarget(null) } }}
          onConfirm={confirmDelete}
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
    </AppShell>
  )
}
