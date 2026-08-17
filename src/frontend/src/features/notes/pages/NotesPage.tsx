import { BookOpenText, ChevronRight, FileText, FolderPlus, Layers3, Loader2, Plus, Save } from 'lucide-react'
import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { cn } from '@/shared/lib/utils'
import { uploadAsset } from '@/features/assets'
import type { ApiEnvelope } from '@/shared/api/contracts'
import { toast } from '@/shared/lib/toast'
import { restoreTrashEntry } from '@/features/trash'
import { CreateNoteDialog } from '../components/CreateNoteDialog'
import * as noteApi from '../api/note.api'
import { noteKeys } from '../api/note.queries'

const JournalRichTextEditor = lazy(() =>
  import('@/shared/components/rich-text/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
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

function getNoteSaveErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: ApiEnvelope<never> } }).response
  return response?.data?.error?.details?.content?.[0] ?? 'Could not save note page right now.'
}

type NoteEntityTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

export function NotesPage() {
  const queryClient = useQueryClient()

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [draftPageId, setDraftPageId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<NoteEntityTarget | null>(null)
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null)
  const savePromiseRef = useRef<Promise<boolean> | null>(null)
  const railFocusRef = useRef<HTMLDivElement>(null)
  const createReturnFocusRef = useRef<HTMLElement | null>(null)
  const entityActionReturnFocusRef = useRef<HTMLElement | null>(null)

  const boardsQuery = useQuery({
    queryKey: noteKeys.boards,
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
    queryKey: noteKeys.page(activePageSummary?.id),
    queryFn: () => noteApi.getPage(activePageSummary!.id),
    enabled: Boolean(activePageSummary?.id),
  })
  const activePage = pageQuery.data

  const createBoard = useMutation({
    mutationFn: noteApi.createBoard,
    onSuccess: async (board) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) => {
        const next = [board, ...current.filter((item) => item.id !== board.id)]
        return next.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
      })
      setSelectedBoardId(board.id)
      setSelectedPageId(null)
      setIsCreatingBoard(false)
      toast.success('Board created successfully')
      await queryClient.invalidateQueries({ queryKey: noteKeys.boards })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => noteApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) =>
        current.map((board) => board.id === page.boardId
          ? { ...board, pages: [toPageSummary(page), ...board.pages.filter((item) => item.id !== page.id)] }
          : board),
      )
      queryClient.setQueryData(noteKeys.page(page.id), page)
      setSelectedBoardId(page.boardId)
      setSelectedPageId(page.id)
      setDraftPageId(page.id)
      setTitle(page.name)
      setContent(page.content)
      setIsDirty(false)
      setSaveStatus('saved')
      setIsCreatingPage(false)
      toast.success('Page created successfully')
      await queryClient.invalidateQueries({ queryKey: noteKeys.boards })
    },
  })
  const renameBoard = useMutation({
    mutationFn: (input: { target: Extract<NoteEntityTarget, { kind: 'board' }>; name: string }) => noteApi.updateBoard(input.target.boardId, { name: input.name }),
    onSuccess: (renamedBoard) => {
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) =>
        current.map((board) => board.id === renamedBoard.id ? { ...board, name: renamedBoard.name, updatedAt: renamedBoard.updatedAt } : board),
      )
      setRenameTarget(null)
      toast.success('Board renamed successfully')
    },
  })
  const renamePage = useMutation({
    mutationFn: (input: { target: Extract<NoteEntityTarget, { kind: 'page' }>; name: string }) => noteApi.updatePage(input.target.pageId, { name: input.name }),
    onSuccess: (page) => {
      queryClient.setQueryData(noteKeys.page(page.id), page)
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) =>
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
    onSuccess: (entry, target) => {
      const current = queryClient.getQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards) ?? []
      const deletedBoard = current.find((board) => board.id === target.boardId)
      const remainingBoards = newestFirst(current.filter((board) => board.id !== target.boardId))
      queryClient.setQueryData(noteKeys.boards, remainingBoards)
      for (const page of deletedBoard?.pages ?? []) queryClient.removeQueries({ queryKey: noteKeys.page(page.id), exact: true })
      setSelectedBoardId(remainingBoards[0]?.id ?? null)
      setSelectedPageId(null)
      setDraftPageId(null)
      setTitle('')
      setContent('')
      setIsDirty(false)
      requestAnimationFrame(() => railFocusRef.current?.focus())
      toast.success('Board moved to Trash.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(() => queryClient.invalidateQueries({ queryKey: noteKeys.boards }))
              .then(() => toast.success('Board restored.'))
              .catch(() => toast.error('Could not restore the board.'))
          },
        },
      })
      void queryClient.invalidateQueries({ queryKey: noteKeys.boards })
    },
  })
  const deletePage = useMutation({
    mutationFn: (target: Extract<NoteEntityTarget, { kind: 'page' }>) => noteApi.deletePage(target.pageId),
    onSuccess: (entry, target) => {
      let nextPageId: string | null = null
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) => current.map((board) => {
        if (board.id !== target.boardId) return board
        const remainingPages = newestFirst(board.pages.filter((page) => page.id !== target.pageId))
        nextPageId = remainingPages[0]?.id ?? null
        return { ...board, pages: remainingPages }
      }))
      queryClient.removeQueries({ queryKey: noteKeys.page(target.pageId), exact: true })
      setSelectedPageId(nextPageId)
      setDraftPageId(null)
      setTitle('')
      setContent('')
      setIsDirty(false)
      requestAnimationFrame(() => railFocusRef.current?.focus())
      toast.success('Page moved to Trash.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(() => queryClient.invalidateQueries({ queryKey: noteKeys.boards }))
              .then(() => toast.success('Page restored.'))
              .catch(() => toast.error('Could not restore the page.'))
          },
        },
      })
      void queryClient.invalidateQueries({ queryKey: noteKeys.boards })
    },
  })

  const boardError = createBoard.isError ? 'Could not create board right now.' : null
  const pageError = editorError ?? (updatePage.isError ? 'Could not save note page right now.' : null)
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
      queryClient.setQueryData(noteKeys.page(page.id), page)
      queryClient.setQueryData<noteApi.NoteBoardSummary[]>(noteKeys.boards, (current = []) =>
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
    }).catch((error: unknown) => {
      setEditorError(getNoteSaveErrorMessage(error))
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
      const asset = await uploadAsset(file, 'note-image')
      return {
        id: asset.id,
        displayUrl: URL.createObjectURL(file),
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
    setIsCreatingPage(false)
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

  function openCreateBoardDialog(returnFocusTo: HTMLElement) {
    createReturnFocusRef.current = returnFocusTo
    createBoard.reset()
    setIsCreatingBoard(true)
  }

  function openCreatePageDialog(returnFocusTo: HTMLElement) {
    createReturnFocusRef.current = returnFocusTo
    createPage.reset()
    setIsCreatingPage(true)
  }

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(12rem,32vh)_minmax(0,1fr)] gap-4 min-[900px]:grid-cols-[220px_minmax(0,1fr)] min-[900px]:grid-rows-1 min-[1200px]:grid-cols-[248px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="m-0 text-sm font-semibold">Boards</h2><p className="m-0 mt-0.5 text-xs text-muted-foreground">{boards.length} collections</p></div><Button type="button" size="icon-sm" variant="ghost" aria-label="Create new board" onClick={(event) => openCreateBoardDialog(event.currentTarget)}><FolderPlus /></Button></div>
          <div ref={railFocusRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-2 outline-none" data-testid="notes-rail-scroll">
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
                        onContextMenu={(event) => { entityActionReturnFocusRef.current = event.currentTarget; void handleSelectBoard(board.id) }}
                      >
                        <ChevronRight className={cn('size-4 shrink-0 transition-transform', isActiveBoard && 'rotate-90')} />
                        <span className="min-w-0 flex-1 truncate">{board.name}</span>
                        <span className="text-[11px] text-muted-foreground">{board.pages.length}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => setRenameTarget({ kind: 'board', boardId: board.id, name: board.name })}>Rename Board</ContextMenuItem>
                      <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteBoard.mutate({ kind: 'board', boardId: board.id, name: board.name })}>Delete Board</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {isActiveBoard ? (
                    <div className="ml-4 mt-1 grid gap-1 border-l border-border pl-2">
                      <Button type="button" variant="ghost" size="sm" className="justify-start px-2 text-primary" onClick={(event) => openCreatePageDialog(event.currentTarget)}><Plus /> Add page</Button>
                      {sortedBoardPages.map((page) => (
                        <ContextMenu key={page.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn('flex min-h-9 w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent', activePageSummary?.id === page.id && 'bg-accent font-semibold text-accent-foreground')}
                              onClick={() => { void handleSelectPage(page.id) }}
                              onContextMenu={(event) => { entityActionReturnFocusRef.current = event.currentTarget; void handleSelectPage(page.id) }}
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
              )
            })}
            {boardsQuery.isLoading ? <p className="px-2 text-sm text-muted-foreground">Loading note boards...</p> : null}
            {boardsQuery.isError ? <p className="px-2 text-sm text-destructive">Could not load note boards.</p> : null}
            {!boardsQuery.isLoading && !boardsQuery.isError && boards.length === 0 ? <div className="px-3 py-10 text-center"><BookOpenText className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="m-0 text-sm font-medium">No note boards yet</p><p className="m-0 mt-1 text-xs leading-5 text-muted-foreground">Create a board to start organizing notes.</p><Button className="mt-4" size="sm" onClick={(event) => openCreateBoardDialog(event.currentTarget)}>Create board</Button></div> : null}
          </div>
        </Card>

        <section className="flex min-h-0 min-w-0 flex-col">
          {activeBoard ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {pages.length === 0 ? (
                <Card className="grid min-h-0 flex-1 place-content-center text-center">
                  <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
                  <h2 className="m-0 text-lg font-semibold">This board has no pages</h2>
                  <p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then start writing your first note.</p>
                  <Button className="mx-auto mt-5" onClick={(event) => openCreatePageDialog(event.currentTarget)}><Plus /> Create page</Button>
                </Card>
              ) : null}
              {pages.length > 0 && activePageSummary ? (
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {pageQuery.isLoading || isOpeningPage ? <p className="m-0 px-5 pt-4 text-sm text-muted-foreground">Loading note page...</p> : null}
                  {pageQuery.isError ? <p className="m-0 px-5 pt-4 text-sm text-destructive">Could not load note page.</p> : null}
                  {activePage ? (
                    <>
                      <div
                        className="grid shrink-0 gap-3 border-b border-border px-4 py-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)_auto] xl:items-center xl:px-5"
                        data-testid="note-editor-header"
                      >
                        <div className="min-w-0">
                          <input
                            aria-label="Note title"
                            className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground"
                            data-testid="note-title-input"
                            disabled={isOpeningPage}
                            maxLength={240}
                            value={draftTitle}
                            onBlur={() => { void persistDraft() }}
                            onChange={(event) => { setContent(draftContent); setTitle(event.target.value); markChanged() }}
                          />
                          <p className="m-0 mt-1 text-sm text-muted-foreground">{formatDate(activePage.date)}</p>
                        </div>
                        <div
                          ref={setToolbarHost}
                          className="min-h-8 min-w-0 [&_.journal-toolbar]:flex-wrap [&_.journal-toolbar]:justify-start xl:[&_.journal-toolbar]:justify-center"
                          data-testid="note-toolbar-host"
                        />
                        <div className="flex shrink-0 items-center justify-end gap-3">
                          <small data-testid="note-save-status" className="text-xs text-muted-foreground">
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed' : isDirty ? 'Unsaved changes' : 'Saved'}
                          </small>
                          <Button type="button" size="sm" disabled={isSaving || !isDirty || !draftTitle.trim()} onClick={() => { void persistDraft() }}>
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                            {saveStatus === 'error' ? 'Retry save' : 'Save'}
                          </Button>
                        </div>
                      </div>
                      {pageError ? <p className="m-0 border-b border-border px-5 py-3 text-sm text-destructive">{pageError}</p> : null}
                      <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                          <JournalRichTextEditor
                            disabled={isOpeningPage}
                            content={draftContent}
                            toolbarAriaLabel="Note formatting tools"
                            toolbarClassName="flex-wrap justify-start xl:justify-center"
                            toolbarHost={toolbarHost}
                            shellClassName="border-0 bg-transparent outline-none shadow-none focus-within:border-0 focus-within:outline-none focus-within:ring-0"
                            contentClassName="min-h-[32rem] border-0 outline-none shadow-none focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none! focus-visible:ring-0"
                            onBlur={() => { void persistDraft() }}
                            onChange={(html) => { setTitle(draftTitle); setContent(html); markChanged() }}
                            onImageFiles={uploadNoteImages}
                            onImageUploadError={(message) => { setEditorError(message); setSaveStatus('error') }}
                          />
                        </div>
                      </Suspense>
                    </>
                  ) : null}
                </Card>
              ) : null}
            </div>
          ) : (
            <Card className="grid min-h-0 flex-1 place-content-center text-center">
              <Layers3 className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h2 className="m-0 text-xl font-semibold">Select or create a note board</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Boards keep related note pages together.</p>
              <Button className="mx-auto mt-5" onClick={(event) => openCreateBoardDialog(event.currentTarget)}><FolderPlus /> Create your first board</Button>
            </Card>
          )}
        </section>
      </div>
      {isCreatingBoard ? (
        <CreateNoteDialog
          entity="Board"
          fallbackRef={railFocusRef}
          pending={createBoard.isPending}
          returnFocusRef={createReturnFocusRef}
          error={boardError}
          onOpenChange={(open) => { if (!open) { setIsCreatingBoard(false); createBoard.reset() } }}
          onConfirm={(name) => createBoard.mutate({ name })}
        />
      ) : null}
      {isCreatingPage && activeBoard ? (
        <CreateNoteDialog
          entity="Page"
          boardName={activeBoard.name}
          fallbackRef={railFocusRef}
          pending={createPage.isPending}
          returnFocusRef={createReturnFocusRef}
          error={createPage.isError ? 'Could not create page right now.' : null}
          onOpenChange={(open) => { if (!open) { setIsCreatingPage(false); createPage.reset() } }}
          onConfirm={(name) => createPage.mutate({ boardId: activeBoard.id, name })}
        />
      ) : null}
      {renameTarget ? (
        <RenameEntityDialog
          key={`${renameTarget.kind}:${renameTarget.kind === 'board' ? renameTarget.boardId : renameTarget.pageId}`}
          entity={renameTarget.kind === 'board' ? 'Board' : 'Page'}
          fallbackRef={railFocusRef}
          initialName={renameTarget.name}
          maxLength={renameTarget.kind === 'board' ? 120 : 240}
          pending={renameBoard.isPending || renamePage.isPending}
          returnFocusRef={entityActionReturnFocusRef}
          error={renameBoard.isError || renamePage.isError ? `Could not rename ${renameTarget.kind} right now.` : null}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          onConfirm={confirmRename}
        />
      ) : null}
    </>
  )
}
