import { FilePenLine, Layers3, Loader2, Plus, Save } from 'lucide-react'
import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import * as assetsApi from '../../lib/api/assets.api'
import * as noteApi from '../../lib/api/note.api'

const JournalRichTextEditor = lazy(() =>
  import('../journal/JournalRichTextEditor').then((module) => ({ default: module.JournalRichTextEditor })),
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
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
  const savePromiseRef = useRef<Promise<boolean> | null>(null)

  const boardsQuery = useQuery({
    queryKey: ['note', 'boards'],
    queryFn: noteApi.listBoards,
  })

  const boards = useMemo(
    () => (boardsQuery.data ?? []).toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [boardsQuery.data],
  )

  const activeBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null
  const pages = useMemo(
    () => (activeBoard?.pages ?? []).toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [activeBoard?.pages],
  )
  const activePageSummary = pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null

  const pageQuery = useQuery({
    queryKey: ['note', 'page', activePageSummary?.id],
    queryFn: () => noteApi.getPage(activePageSummary!.id),
    enabled: Boolean(activePageSummary?.id),
  })

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
  const updatePage = useMutation({
    mutationFn: (input: { pageId: string; patch: noteApi.UpdateNotePageInput }) => noteApi.updatePage(input.pageId, input.patch),
  })

  const boardError = createBoard.isError ? 'Could not create board right now.' : null
  const pageError = editorError ?? (createPage.isError || updatePage.isError ? 'Could not save note page right now.' : null)
  const activePage = pageQuery.data
  const isOpeningPage = pageQuery.isLoading
  const isSaving = saveStatus === 'saving'
  // Server data is the clean draft. Local state becomes authoritative only after an edit,
  // which avoids a state-setting effect and prevents a refetch from overwriting a dirty draft.
  const hasServerDraft = Boolean(activePage && !isDirty && activePage.id !== draftPageId)
  const draftTitle = hasServerDraft ? activePage!.name : title
  const draftContent = hasServerDraft ? activePage!.content : content

  const textContent = useMemo(() => {
    const div = document.createElement('div')
    div.innerHTML = draftContent
    return div.textContent || ''
  }, [draftContent])

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

  return (
    <AppShell title="Notes" description="Organize boards, pages, and rich-text drafts in one workspace." contentClassName="max-w-none p-0">
      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-6 py-6 lg:px-8">
          <div>
            <span className="preview-label">Note Workspace</span>
            <h1 className="m-0 mt-1 text-2xl font-semibold tracking-tight text-foreground">Capture boards, pages, and drafts in one place.</h1>
          </div>
          <button
            className="primary-button m-0 inline-flex min-h-10 w-auto items-center gap-2 px-4"
            type="button"
            onClick={() => setIsBoardFormOpen((current) => !current)}
          >
            <Plus size={18} />
            New board
          </button>
        </header>

        <div className="grid min-h-[calc(100vh-10rem)] gap-6 p-6 lg:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)] lg:p-8">
          <aside className="min-w-0">
            <section className="rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-4 p-5 pb-0">
                <div>
                  <h2 className="m-0 text-lg font-semibold text-foreground">Boards</h2>
                  <p className="m-0 mt-1 text-sm text-muted-foreground">{boards.length} total</p>
                </div>
              </div>

              {isBoardFormOpen ? (
                <form
                  className="m-5 grid gap-3 rounded-lg border border-border bg-muted/35 p-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const name = newBoardName.trim()
                    if (name) createBoard.mutate({ name })
                  }}
                >
                  <label className="text-sm font-medium text-foreground" htmlFor="note-board-name">Board name</label>
                  <input
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    id="note-board-name"
                    value={newBoardName}
                    onChange={(event) => setNewBoardName(event.target.value)}
                    placeholder="Learning notes"
                    maxLength={120}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" className="secondary-button" onClick={() => setIsBoardFormOpen(false)}>Cancel</button>
                    <button type="submit" className="primary-button m-0 w-auto" disabled={createBoard.isPending || !newBoardName.trim()}>
                      Create board
                    </button>
                  </div>
                  {boardError ? <p className="flashcard-status flashcard-status--error">{boardError}</p> : null}
                </form>
              ) : null}

              {boardsQuery.isLoading ? <p className="flashcard-status">Loading note boards...</p> : null}
              {boardsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load note boards.</p> : null}

              {!boardsQuery.isLoading && !boardsQuery.isError && boards.length === 0 ? (
                <div className="m-5 grid gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                  <Layers3 size={28} />
                  <h2 className="m-0 text-lg font-semibold text-foreground">No note boards yet</h2>
                  <p className="m-0 text-sm text-muted-foreground">Start with one board for study notes, reflections, or draft ideas.</p>
                  <button className="primary-button m-0 w-auto" type="button" onClick={() => setIsBoardFormOpen(true)}>
                    Create your first board
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 p-5">
                {boards.map((board) => {
                  const isActiveBoard = activeBoard?.id === board.id
                  const sortedBoardPages = board.pages.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
                  return (
                    <div className="grid gap-2" key={board.id}>
                      <button
                        className={isActiveBoard ? 'flex w-full items-center justify-between gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 text-left' : 'flex w-full items-center justify-between gap-3 rounded-md border border-transparent bg-muted/50 p-3 text-left hover:border-primary/20 hover:bg-accent'}
                        type="button"
                        onClick={() => { void handleSelectBoard(board.id) }}
                      >
                        <span>{board.name}</span>
                        <small>{board.pages.length} {board.pages.length === 1 ? 'page' : 'pages'}</small>
                      </button>

                      {isActiveBoard ? (
                        <div className="grid gap-1 pl-3">
                          {sortedBoardPages.map((page) => (
                            <button
                              key={page.id}
                              className={activePageSummary?.id === page.id ? 'flex w-full items-center gap-2 rounded-md border border-primary/25 bg-card px-3 py-2 text-left text-primary' : 'flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left text-muted-foreground hover:bg-accent'}
                              type="button"
                              onClick={() => { void handleSelectPage(page.id) }}
                            >
                              <FilePenLine size={14} />
                              <span>{page.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <section className="min-h-full rounded-lg border border-border bg-card pb-6 shadow-sm">
              {activeBoard ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-0">
                    <div>
                      <span className="preview-label">Active board</span>
                      <h2 className="m-0 mt-1 text-xl font-semibold text-foreground">{activeBoard.name}</h2>
                      <p className="m-0 mt-1 text-sm text-muted-foreground">{pages.length === 0 ? 'No pages yet.' : `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} ready.`}</p>
                    </div>
                    <button
                      className="primary-button m-0 inline-flex min-h-10 w-auto items-center gap-2 px-4"
                      type="button"
                      onClick={() => setIsPageFormOpen((current) => !current)}
                    >
                      <Plus size={18} />
                      New page
                    </button>
                  </div>

                  {isPageFormOpen ? (
                    <form
                      className="mx-5 mt-4 grid gap-3 rounded-lg border border-border bg-muted/35 p-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const name = newPageName.trim()
                        if (name && activeBoard) createPage.mutate({ boardId: activeBoard.id, name })
                      }}
                    >
                      <label className="text-sm font-medium text-foreground" htmlFor="note-page-name">Page name</label>
                      <input
                        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        id="note-page-name"
                        value={newPageName}
                        onChange={(event) => setNewPageName(event.target.value)}
                        placeholder="Week 1 reflections"
                        maxLength={240}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" className="secondary-button" onClick={() => setIsPageFormOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-button m-0 w-auto" disabled={createPage.isPending || !newPageName.trim()}>
                          Create page
                        </button>
                      </div>
                      {pageError ? <p className="flashcard-status flashcard-status--error">{pageError}</p> : null}
                    </form>
                  ) : null}

                  {pages.length === 0 ? (
                    <div className="m-5 grid min-h-80 place-content-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                      <FilePenLine size={30} />
                      <h2 className="m-0 text-lg font-semibold text-foreground">No pages in this board yet</h2>
                      <p className="m-0 text-sm text-muted-foreground">Create the first page and FluentA will open it immediately with a blank draft.</p>
                      <button className="primary-button m-0 w-auto" type="button" onClick={() => setIsPageFormOpen(true)}>
                        Create first page
                      </button>
                    </div>
                  ) : null}

                  {pages.length > 0 && activePageSummary ? (
                    <div className="grid gap-4 p-5">
                      {pageQuery.isLoading || isOpeningPage ? <p className="flashcard-status">Loading note page...</p> : null}
                      {pageQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load note page.</p> : null}

                      {activePage ? (
                        <>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>{formatDate(activePage.date)}</span>
                            <span>Updated {formatDate(activePage.updatedAt)}</span>
                          </div>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <span className="preview-label">Editable note</span>
                              <p className="m-0 mt-1 text-sm text-muted-foreground">Blur saves your draft. Switching pages saves first, then opens the next note.</p>
                            </div>
                            <button
                              className="primary-button m-0 inline-flex min-h-10 w-auto items-center gap-2 px-4"
                              type="button"
                              disabled={isSaving || !isDirty || !draftTitle.trim()}
                              onClick={() => { void persistDraft() }}
                            >
                              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              {saveStatus === 'error' ? 'Retry save' : 'Save'}
                            </button>
                          </div>

                          {pageError ? <p className="flashcard-status flashcard-status--error">{pageError}</p> : null}

                          <input
                            aria-label="Note title"
                            className="w-full border-0 border-b border-border bg-transparent pb-3 text-2xl font-semibold tracking-tight text-foreground focus:border-primary focus:outline-none"
                            data-testid="note-title-input"
                            disabled={isOpeningPage}
                            maxLength={240}
                            value={draftTitle}
                            onBlur={() => { void persistDraft() }}
                            onChange={(event) => {
                              setContent(draftContent)
                              setTitle(event.target.value)
                              markChanged()
                            }}
                          />

                          <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                            <div className="min-h-[28rem] rounded-lg border border-border bg-background p-4 [&_.journal-rich-text-content]:min-h-80">
                              <JournalRichTextEditor
                                disabled={isOpeningPage}
                                content={draftContent}
                                onBlur={() => { void persistDraft() }}
                                onChange={(html) => {
                                  setTitle(draftTitle)
                                  setContent(html)
                                  markChanged()
                                }}
                                onImageFiles={uploadNoteImages}
                                onImageUploadError={(message) => {
                                  setEditorError(message)
                                  setSaveStatus('error')
                                }}
                              />
                            </div>
                          </Suspense>

                          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
                            <div className="flex gap-4">
                              <span><strong>{textContent.trim() ? textContent.trim().split(/\s+/).length : 0}</strong> words</span>
                              <span><strong>{textContent.length}</strong> characters</span>
                            </div>
                            <small data-testid="note-save-status">
                              {saveStatus === 'saving'
                                ? 'Saving...'
                                : saveStatus === 'saved'
                                  ? 'Saved'
                                  : saveStatus === 'error'
                                    ? 'Save failed'
                                    : isDirty
                                      ? 'Unsaved changes'
                                      : 'Saved'}
                            </small>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="m-5 grid min-h-80 place-content-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                  <Layers3 size={30} />
                  <h2 className="m-0 text-lg font-semibold text-foreground">Select a board to begin</h2>
                  <p className="m-0 text-sm text-muted-foreground">Choose a board from the left to browse its pages and open note detail.</p>
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
