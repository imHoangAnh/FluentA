import { BookOpenText, ChevronRight, FileText, FolderPlus, Plus, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { ColumnSettings } from '@/components/vocabulary/ColumnSettings'
import { VocabTable } from '@/components/vocabulary/VocabTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import * as vocabularyApi from '@/lib/api/vocabulary.api'
import { supportedLanguageProfiles } from '@/lib/language'
import { cn } from '@/lib/utils'

export function WorkspacePage() {
  const queryClient = useQueryClient()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardLanguage, setNewBoardLanguage] = useState('en')
  const [newPageName, setNewPageName] = useState('')

  const boardsQuery = useQuery({ queryKey: ['vocab', 'boards'], queryFn: vocabularyApi.listBoards })
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data])
  const sortedBoards = useMemo(
    () => boards.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [boards],
  )
  const activeBoardId = selectedBoardId ?? sortedBoards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: ['vocab', 'boards', activeBoardId],
    queryFn: () => vocabularyApi.getBoard(activeBoardId!),
    enabled: Boolean(activeBoardId),
  })

  const activeBoard = boardQuery.data
  const sortedPages = useMemo(
    () => (activeBoard?.pages ?? []).toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
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
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page) => {
      setSelectedPageId(page.id)
      setNewPageName('')
      setIsCreatingPage(false)
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

  return (
    <AppShell
      title="Vocabulary"
      description="Organize boards, pages, and words in one focused workspace"
      contentClassName="max-w-none"
      headerActions={activeBoard ? <Badge variant="outline">{activeBoard.language.toUpperCase()}</Badge> : undefined}
    >
      <div className="grid min-h-[calc(100vh-9.5rem)] grid-cols-[248px_minmax(0,1fr)] gap-4 max-lg:grid-cols-[220px_minmax(0,1fr)]">
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

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {sortedBoards.map((board) => (
              <div className="mb-1" key={board.id}>
                <button
                  type="button"
                  className={cn('flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', activeBoardId === board.id && 'bg-secondary text-secondary-foreground')}
                  onClick={() => { setSelectedBoardId(board.id); setSelectedPageId(null); setIsCreatingPage(false) }}
                >
                  <ChevronRight className={cn('size-4 shrink-0 transition-transform duration-150', activeBoardId === board.id && 'rotate-90')} />
                  <span className="min-w-0 flex-1 truncate">{board.name}</span>
                  <span className="text-[11px] text-muted-foreground">{board.pageCount}</span>
                </button>
                {activeBoard?.id === board.id ? (
                  <div className="ml-4 mt-1 grid gap-1 border-l border-border pl-2">
                    {sortedPages.map((page) => (
                      <button
                        type="button"
                        key={page.id}
                        className={cn('flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent', activePage?.id === page.id && 'bg-accent font-semibold text-accent-foreground')}
                        onClick={() => setSelectedPageId(page.id)}
                      >
                        <FileText className="size-3.5 shrink-0" /><span className="truncate">{page.name}</span>
                      </button>
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

        <section className="min-w-0">
          {activeBoard ? (
            <div className="grid gap-4">
              <Card className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0"><p className="m-0 text-xs font-medium text-muted-foreground">{activeBoard.name}</p><h2 className="m-0 mt-1 truncate text-xl font-semibold tracking-[-0.02em]">{activePage?.name ?? 'Create your first page'}</h2></div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" aria-label="Table view"><Rows3 /></Button>
                  <ColumnSettings preferences={activeBoard.preferences} onSave={async (preferences) => { await updatePreferences.mutateAsync(preferences) }} />
                </div>
              </Card>

              {isCreatingPage ? (
                <Card>
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
                <Card className="grid min-h-80 place-content-center text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="m-0 text-lg font-semibold">This board has no pages</h2><p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then add your first vocabulary row.</p><Button className="mx-auto mt-5" onClick={() => setIsCreatingPage(true)}><Plus /> Create page</Button></Card>
              )}
            </div>
          ) : (
            <Card className="grid min-h-[calc(100vh-9.5rem)] place-content-center text-center"><BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground" /><h2 className="m-0 text-xl font-semibold">Select or create a vocabulary board</h2><p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">Boards keep related pages and learning material together.</p><Button className="mx-auto mt-5" onClick={() => setIsCreatingBoard(true)}><FolderPlus /> Create board</Button></Card>
          )}
        </section>
      </div>
    </AppShell>
  )
}
