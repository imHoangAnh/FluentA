import { BookOpenText, ChevronRight, FileText, FolderPlus, Layers3, Loader2, Plus, Save } from 'lucide-react'
import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/shared/components/layout/AppShell'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import * as assetsApi from '@/lib/api/assets.api'
import { toast } from '@/lib/toast'
import { DeleteNoteConfirmationDialog } from '../components/DeleteNoteConfirmationDialog'
import * as noteApi from '../api/note.api'

const JournalRichTextEditor = lazy(() =>
  import('@/features/journal').then((module) => ({ default: module.JournalRichTextEditor })),
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function newestFirst<T extends { createdAt: string; id: string }>(items: T[]) {
  return items.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
}

function toPageSummary(page: noteApi.NotePage): noteApi.NotePageSummary {
  return {
    id: page.id,
    boardId: page.boardId,
    name: page.name,
    date: page.date,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }
}

type NoteEntityTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

export function NotesPage() {
  const queryClient = useQueryClient()

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isBoardFormOpen, setIsBoardFormOpen] = useState(false)
  const [isPageFormOpen, setIsPageFormOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [draftPageId, setDraftPageId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<NoteEntityTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NoteEntityTarget | null>(null)
  const savePromiseRef = useRef<Promise<boolean> | null>(null)

  const boardsQuery = useQuery({
    queryKey: ['note', 'boards'],
    queryFn: noteApi.listBoards,
  })

  const boards = useMemo(
    () => newestFirst(boardsQuery.data ?? []),
    [boardsQuery.data],
  )

  const activeBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null
  const pages = useMemo(
    () => newestFirst(activeBoard?.pages ?? []),
    [activeBoard?.pages],
  )
  const activePageSummary = pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null

  const pageQuery = useQuery({
    queryKey: ['note', 'page', activePageSummary?.id],
    queryFn: () => noteApi.getPage(activePageSummary!.id),
    enabled: Boolean(activePageSummary?.id),
  })
  const activePage = pageQuery.data

  const createBoard = useMutation({
    mutationFn: noteApi.createBoard,
    onSuccess: async (board) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) => {
        const next = [board, ...current.filter((item) => item.id !== board.id)]
        return next.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
      })
      setSelectedBoardId(board.id)
      setSelectedPageId(null)
      setNewBoardName('')
      setIsBoardFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['note', 'boards'] })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => noteApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) =>
        current.map((board) => board.id === page.boardId
          ? { ...board, pages: [toPageSummary(page), ...board.pages.filter((item) => item.id !== page.id)] }
          : board),
      )
      queryClient.setQueryData(['note', 'page', page.id], page)
      setSelectedBoardId(page.boardId)
      setSelectedPageId(page.id)
      setDraftPageId(page.id)
      setTitle(page.name)
      setContent(page.content)
      setIsDirty(false)
      setSaveStatus('saved')
      setNewPageName('')
      setIsPageFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['note', 'boards'] })
    },
  })
  const renameBoard = useMutation({
    mutationFn: (input: { target: Extract<NoteEntityTarget, { kind: 'board' }>; name: string }) => noteApi.updateBoard(input.target.boardId, { name: input.name }),
    onSuccess: (renamedBoard) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) =>
        current.map((board) => board.id === renamedBoard.id ? { ...board, name: renamedBoard.name, updatedAt: renamedBoard.updatedAt } : board),
      )
      setRenameTarget(null)
      toast.success('Board renamed successfully')
    },
  })
  const renamePage = useMutation({
    mutationFn: (input: { target: Extract<NoteEntityTarget, { kind: 'page' }>; name: string }) => noteApi.updatePage(input.target.pageId, { name: input.name }),
    onSuccess: (page) => {
      queryClient.setQueryData(['note', 'page', page.id], page)
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) =>
        current.map((board) => board.id === page.boardId
          ? { ...board, updatedAt: page.updatedAt, pages: board.pages.map((item) => item.id === page.id ? toPageSummary(page) : item) }
          : board),
      )
      if (activePage?.id === page.id) {
        setDraftPageId(page.id)
        setTitle(page.name)
        if (!isDirty) {
          setContent(page.content)
          setSaveStatus('saved')
        }
      }
      setRenameTarget(null)
      toast.success('Page renamed successfully')
    },
  })
  const updatePage = useMutation({
    mutationFn: (input: { pageId: string; patch: noteApi.UpdateNotePageInput }) => noteApi.updatePage(input.pageId, input.patch),
  })
  const deleteBoard = useMutation({
    mutationFn: (target: Extract<NoteEntityTarget, { kind: 'board' }>) => noteApi.deleteBoard(target.boardId),
    onSuccess: (_, target) => {
      const current = queryClient.getQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards']) ?? []
      const deletedBoard = current.find((board) => board.id === target.boardId)
      const remainingBoards = newestFirst(current.filter((board) => board.id !== target.boardId))
      queryClient.setQueryData(['note', 'boards'], remainingBoards)
      for (const page of deletedBoard?.pages ?? []) queryClient.removeQueries({ queryKey: ['note', 'page', page.id], exact: true })
      setSelectedBoardId(remainingBoards[0]?.id ?? null)
      setSelectedPageId(null)
      setDraftPageId(null)
      setTitle('')
      setContent('')
      setIsDirty(false)
      setDeleteTarget(null)
      toast.success('Board deleted successfully')
      void queryClient.invalidateQueries({ queryKey: ['note', 'boards'] })
    },
  })
  const deletePage = useMutation({
    mutationFn: (target: Extract<NoteEntityTarget, { kind: 'page' }>) => noteApi.deletePage(target.pageId),
    onSuccess: (_, target) => {
      let nextPageId: string | null = null
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) => current.map((board) => {
        if (board.id !== target.boardId) return board
        const remainingPages = newestFirst(board.pages.filter((page) => page.id !== target.pageId))
        nextPageId = remainingPages[0]?.id ?? null
        return { ...board, pages: remainingPages }
      }))
      queryClient.removeQueries({ queryKey: ['note', 'page', target.pageId], exact: true })
      setSelectedPageId(nextPageId)
      setDraftPageId(null)
      setTitle('')
      setContent('')
      setIsDirty(false)
      setDeleteTarget(null)
      toast.success('Page deleted successfully')
      void queryClient.invalidateQueries({ queryKey: ['note', 'boards'] })
    },
  })

  const boardError = createBoard.isError ? 'Could not create board right now.' : null
  const pageError = editorError ?? (createPage.isError || updatePage.isError ? 'Could not save note page right now.' : null)
  const isOpeningPage = pageQuery.isLoading
  const isSaving = saveStatus === 'saving'
  // Server data is the clean draft. Local state becomes authoritative only after an edit,
  // which avoids a state-setting effect and prevents a refetch from overwriting a dirty draft.
  const hasServerDraft = Boolean(activePage && !isDirty && activePage.id !== draftPageId)
  const draftTitle = hasServerDraft ? activePage!.name : title
  const draftContent = hasServerDraft ? activePage!.content : content

  async function persistDraft() {
    if (!activePage || !isDirty) return true
    if (savePromiseRef.current) return savePromiseRef.current
    if (!draftTitle.trim()) {
      setSaveStatus('error')
      return false
    }

    setSaveStatus('saving')
    setEditorError(null)
    const promise = updatePage.mutateAsync({
      pageId: activePage.id,
      patch: {
        name: draftTitle,
        content: draftContent,
      },
    }).then((page) => {
      queryClient.setQueryData(['note', 'page', page.id], page)
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(['note', 'boards'], (current = []) =>
        current.map((board) => board.id === page.boardId
          ? {
              ...board,
              updatedAt: page.updatedAt,
              pages: board.pages.map((item) => item.id === page.id ? toPageSummary(page) : item),
            }
          : board),
      )
      setDraftPageId(page.id)
      setTitle(page.name)
      setContent(page.content)
      setIsDirty(false)
      setSaveStatus('saved')
      return true
    }).catch(() => {
      setSaveStatus('error')
      return false
    }).finally(() => {
      savePromiseRef.current = null
    })

    savePromiseRef.current = promise
    return promise
  }

  function markChanged() {
    setIsDirty(true)
    setSaveStatus('idle')
    setEditorError(null)
  }

  async function uploadNoteImages(files: File[]) {
    const uploads = await Promise.all(files.map(async (file) => {
      const asset = await assetsApi.uploadNoteImageAsset(file)
      return {
        id: asset.id,
        publicUrl: asset.publicUrl,
        alt: file.name,
      }
    }))

    if (uploads.length > 0) {
      markChanged()
    }

    return uploads
  }

  async function handleSelectBoard(boardId: string) {
    if (boardId === activeBoard?.id) return
    const saved = await persistDraft()
    if (!saved) return
    setSelectedBoardId(boardId)
    setSelectedPageId(null)
  }

  async function handleSelectPage(pageId: string) {
    if (pageId === activePageSummary?.id) return
    const saved = await persistDraft()
    if (!saved) return
    setSelectedPageId(pageId)
  }

  function confirmRename(name: string) {
    if (!renameTarget) return
    if (renameTarget.kind === 'board') renameBoard.mutate({ target: renameTarget, name })
    else renamePage.mutate({ target: renameTarget, name })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'board') deleteBoard.mutate(deleteTarget)
    else deletePage.mutate(deleteTarget)
  }

  return (
    <AppShell title="Notes" description="Organize boards, pages, and rich-text drafts in one workspace." contentClassName="h-screen max-w-none">
      <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)] gap-4 max-lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="m-0 text-sm font-semibold">Boards</h2><p className="m-0 mt-0.5 text-xs text-muted-foreground">{boards.length} collections</p></div><Button type="button" size="icon-sm" variant="ghost" aria-label="Create new board" onClick={() => setIsBoardFormOpen((value) => !value)}><FolderPlus /></Button></div>
          {isBoardFormOpen ? <form className="grid gap-3 border-b border-border bg-secondary/30 p-3" onSubmit={(event) => { event.preventDefault(); const name = newBoardName.trim(); if (name) createBoard.mutate({ name }) }}><div className="grid gap-1.5"><label className="text-xs font-medium" htmlFor="note-board-name">Board name</label><Input id="note-board-name" value={newBoardName} onChange={(event) => setNewBoardName(event.target.value)} placeholder="Learning notes" maxLength={120} autoFocus required /></div><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setIsBoardFormOpen(false)}>Cancel</Button><Button type="submit" size="sm" disabled={createBoard.isPending || !newBoardName.trim()}>Create</Button></div>{boardError ? <p className="m-0 text-sm text-destructive">{boardError}</p> : null}</form> : null}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {boards.map((board) => {
              const isActiveBoard = activeBoard?.id === board.id
              const sortedBoardPages = newestFirst(board.pages)
              return (
                <div className="mb-1" key={board.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn('flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', isActiveBoard && 'bg-secondary text-secondary-foreground')}
                        onClick={() => { void handleSelectBoard(board.id) }}
                        onContextMenu={() => { void handleSelectBoard(board.id) }}
                      >
                        <ChevronRight className={cn('size-4 shrink-0 transition-transform', isActiveBoard && 'rotate-90')} />
                        <span className="min-w-0 flex-1 truncate">{board.name}</span>
                        <span className="text-[11px] text-muted-foreground">{board.pages.length}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'board', boardId: board.id, name: board.name })}>Rename Board</ContextMenuItem>
                      <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget({ kind: 'board', boardId: board.id, name: board.name })}>Delete Board</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {isActiveBoard ? (
                    <div className="ml-4 mt-1 grid gap-1 border-l border-border pl-2">
                      {sortedBoardPages.map((page) => (
                        <ContextMenu key={page.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn('flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent', activePageSummary?.id === page.id && 'bg-accent font-semibold text-accent-foreground')}
                              onClick={() => { void handleSelectPage(page.id) }}
                              onContextMenu={() => { void handleSelectPage(page.id) }}
                            >
                              <FileText className="size-3.5 shrink-0" /><span className="truncate">{page.name}</span>
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name })}>Rename Page</ContextMenuItem>
                            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget({ kind: 'page', boardId: board.id, pageId: page.id, name: page.name })}>Delete Page</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                      <Button type="button" variant="ghost" size="sm" className="justify-start px-2 text-primary" onClick={() => setIsPageFormOpen(true)}><Plus /> Add page</Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {boardsQuery.isLoading ? <p className="px-2 text-sm text-muted-foreground">Loading note boards...</p> : null}
            {boardsQuery.isError ? <p className="px-2 text-sm text-destructive">Could not load note boards.</p> : null}
            {!boardsQuery.isLoading && !boardsQuery.isError && boards.length === 0 ? <div className="px-3 py-10 text-center"><BookOpenText className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="m-0 text-sm font-medium">No note boards yet</p><p className="m-0 mt-1 text-xs leading-5 text-muted-foreground">Create a board to start organizing notes.</p><Button className="mt-4" size="sm" onClick={() => setIsBoardFormOpen(true)}>Create board</Button></div> : null}
          </div>
        </Card>

        <section className="flex min-h-0 min-w-0 flex-col">
          {activeBoard ? <div className="flex min-h-0 flex-1 flex-col gap-4">
            <Card className="flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><h2 className="m-0 truncate text-xl font-semibold tracking-[-0.02em]">{activePageSummary?.name ?? 'Create your first page'}</h2></div><Button type="button" size="sm" onClick={() => setIsPageFormOpen((value) => !value)}><Plus /> Add page</Button></Card>
            {isPageFormOpen ? <Card className="shrink-0"><form className="flex items-end gap-3 p-4" onSubmit={(event) => { event.preventDefault(); const name = newPageName.trim(); if (name) createPage.mutate({ boardId: activeBoard.id, name }) }}><div className="grid flex-1 gap-1.5"><label className="text-xs font-medium" htmlFor="note-page-name">Page name</label><Input id="note-page-name" value={newPageName} onChange={(event) => setNewPageName(event.target.value)} placeholder="Week 1 reflections" maxLength={240} autoFocus required /></div><Button type="button" variant="ghost" onClick={() => setIsPageFormOpen(false)}>Cancel</Button><Button type="submit" disabled={createPage.isPending || !newPageName.trim()}>Create page</Button></form>{pageError ? <p className="m-0 px-4 pb-4 text-sm text-destructive">{pageError}</p> : null}</Card> : null}
            {pages.length === 0 ? <Card className="grid min-h-0 flex-1 place-content-center text-center"><FileText className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="m-0 text-lg font-semibold">This board has no pages</h2><p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then start writing your first note.</p><Button className="mx-auto mt-5" onClick={() => setIsPageFormOpen(true)}><Plus /> Create page</Button></Card> : null}
            {pages.length > 0 && activePageSummary ? <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {pageQuery.isLoading || isOpeningPage ? <p className="m-0 px-5 pt-4 text-sm text-muted-foreground">Loading note page...</p> : null}
              {pageQuery.isError ? <p className="m-0 px-5 pt-4 text-sm text-destructive">Could not load note page.</p> : null}
              {activePage ? <><div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4"><div className="min-w-0 flex-1"><input aria-label="Note title" className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground" data-testid="note-title-input" disabled={isOpeningPage} maxLength={240} value={draftTitle} onBlur={() => { void persistDraft() }} onChange={(event) => { setContent(draftContent); setTitle(event.target.value); markChanged() }} /><p className="m-0 mt-1 text-sm text-muted-foreground">{formatDate(activePage.date)}</p></div><div className="flex shrink-0 items-center gap-3"><small data-testid="note-save-status" className="text-xs text-muted-foreground">{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed' : isDirty ? 'Unsaved changes' : 'Saved'}</small><Button type="button" size="sm" disabled={isSaving || !isDirty || !draftTitle.trim()} onClick={() => { void persistDraft() }}>{isSaving ? <Loader2 className="animate-spin" /> : <Save />}{saveStatus === 'error' ? 'Retry save' : 'Save'}</Button></div></div>{pageError ? <p className="m-0 border-b border-border px-5 py-3 text-sm text-destructive">{pageError}</p> : null}<Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}><div className="min-h-0 flex-1 overflow-y-auto p-5 [&_.journal-rich-text-content]:min-h-[32rem]"><JournalRichTextEditor disabled={isOpeningPage} content={draftContent} onBlur={() => { void persistDraft() }} onChange={(html) => { setTitle(draftTitle); setContent(html); markChanged() }} onImageFiles={uploadNoteImages} onImageUploadError={(message) => { setEditorError(message); setSaveStatus('error') }} /></div></Suspense></> : null}
            </Card> : null}
          </div> : <Card className="grid min-h-0 flex-1 place-content-center text-center"><Layers3 className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="m-0 text-xl font-semibold">Select or create a note board</h2><p className="m-0 mt-2 text-sm text-muted-foreground">Boards keep related note pages together.</p><Button className="mx-auto mt-5" onClick={() => setIsBoardFormOpen(true)}><FolderPlus /> Create your first board</Button></Card>}
        </section>
      </div>
      {renameTarget ? (
        <RenameEntityDialog
          key={`${renameTarget.kind}:${renameTarget.kind === 'board' ? renameTarget.boardId : renameTarget.pageId}`}
          entity={renameTarget.kind === 'board' ? 'Board' : 'Page'}
          initialName={renameTarget.name}
          maxLength={renameTarget.kind === 'board' ? 120 : 240}
          pending={renameBoard.isPending || renamePage.isPending}
          error={renameBoard.isError || renamePage.isError ? `Could not rename ${renameTarget.kind} right now.` : null}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          onConfirm={confirmRename}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteNoteConfirmationDialog
          entity={deleteTarget.kind === 'board' ? 'Board' : 'Page'}
          name={deleteTarget.name}
          pending={deleteBoard.isPending || deletePage.isPending}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </AppShell>
  )
}
