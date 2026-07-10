import {
  CalendarClock,
  CheckSquare,
  Columns3,
  FilePenLine,
  FileText,
  Globe,
  HelpCircle,
  Kanban,
  Layers3,
  Loader2,
  LogOut,
  NotebookPen,
  Plus,
  Repeat2,
  Save,
  Settings,
  Timer,
} from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import { getUserAvatarUrl } from '../../lib/avatar'
import * as assetsApi from '../../lib/api/assets.api'
import * as noteApi from '../../lib/api/note.api'
import { useAuthStore } from '../../stores/authStore'
import '../dashboard/DashboardPage.css'
import './NotesPage.css'

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
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

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
  const [openingPageId, setOpeningPageId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!pageQuery.data || pageQuery.data.id === draftPageId) return
    setDraftPageId(pageQuery.data.id)
    setTitle(pageQuery.data.name)
    setContent(pageQuery.data.content)
    setIsDirty(false)
    setSaveStatus('saved')
    setOpeningPageId(null)
  }, [draftPageId, pageQuery.data])

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
  const isOpeningPage = openingPageId !== null
  const isSaving = saveStatus === 'saving'

  const textContent = useMemo(() => {
    const div = document.createElement('div')
    div.innerHTML = content
    return div.textContent || ''
  }, [content])

  async function persistDraft() {
    if (!activePage || !isDirty) return true
    if (savePromiseRef.current) return savePromiseRef.current
    if (!title.trim()) {
      setSaveStatus('error')
      return false
    }

    setSaveStatus('saving')
    setEditorError(null)
    const promise = updatePage.mutateAsync({
      pageId: activePage.id,
      patch: {
        name: title,
        content,
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
    setOpeningPageId(null)
  }

  async function handleSelectPage(pageId: string) {
    if (pageId === activePageSummary?.id) return
    const saved = await persistDraft()
    if (!saved) return
    setOpeningPageId(pageId)
    setSelectedPageId(pageId)
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Globe size={24} />
          </div>
          <div className="dashboard-brand-text">
            <h1>FluentA</h1>
            <p>Language Learning</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Columns3 size={20} /> Today
          </Link>
          <Link to="/vocabulary" className={location.pathname === '/vocabulary' ? 'active' : ''}>
            <FileText size={20} /> Vocabulary
          </Link>
          <LearningNavLinks />
          <Link to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            <CheckSquare size={20} /> Todo
          </Link>
          <Link to="/habits" className={location.pathname === '/habits' ? 'active' : ''}>
            <Repeat2 size={20} /> Habits
          </Link>
          <Link to="/countdowns" className={location.pathname === '/countdowns' ? 'active' : ''}>
            <CalendarClock size={20} /> Countdowns
          </Link>
          <Link to="/journal" className={location.pathname === '/journal' ? 'active' : ''}>
            <NotebookPen size={20} /> Journal
          </Link>
          <Link to="/kanban" className={location.pathname === '/kanban' ? 'active' : ''}>
            <Kanban size={20} /> Kanban
          </Link>
          <Link to="/pomodoro" className={location.pathname === '/pomodoro' ? 'active' : ''}>
            <Timer size={20} /> Pomodoro
          </Link>
        </nav>

        <div className="dashboard-user-section">
          <div className="dashboard-user-card">
            <img className="dashboard-user-avatar" src={avatarUrl} alt="User" />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(event) => { event.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main notes-main">
        <header className="notes-header">
          <div>
            <span className="preview-label">Note Workspace</span>
            <h1>Capture boards, pages, and drafts in one place.</h1>
          </div>
          <button
            className="primary-button notes-header__action"
            type="button"
            onClick={() => setIsBoardFormOpen((current) => !current)}
          >
            <Plus size={18} />
            New board
          </button>
        </header>

        <div className="notes-shell">
          <aside className="notes-shell__sidebar">
            <section className="notes-panel">
              <div className="notes-panel__header">
                <div>
                  <h2>Boards</h2>
                  <p>{boards.length} total</p>
                </div>
              </div>

              {isBoardFormOpen ? (
                <form
                  className="notes-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const name = newBoardName.trim()
                    if (name) createBoard.mutate({ name })
                  }}
                >
                  <label htmlFor="note-board-name">Board name</label>
                  <input
                    id="note-board-name"
                    value={newBoardName}
                    onChange={(event) => setNewBoardName(event.target.value)}
                    placeholder="Learning notes"
                    maxLength={120}
                    autoFocus
                  />
                  <div className="notes-form__actions">
                    <button type="button" className="notes-button notes-button--ghost" onClick={() => setIsBoardFormOpen(false)}>Cancel</button>
                    <button type="submit" className="notes-button notes-button--primary" disabled={createBoard.isPending || !newBoardName.trim()}>
                      Create board
                    </button>
                  </div>
                  {boardError ? <p className="flashcard-status flashcard-status--error">{boardError}</p> : null}
                </form>
              ) : null}

              {boardsQuery.isLoading ? <p className="flashcard-status">Loading note boards...</p> : null}
              {boardsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load note boards.</p> : null}

              {!boardsQuery.isLoading && !boardsQuery.isError && boards.length === 0 ? (
                <div className="empty-panel notes-empty-panel">
                  <Layers3 size={28} />
                  <h2>No note boards yet</h2>
                  <p>Start with one board for study notes, reflections, or draft ideas.</p>
                  <button className="primary-button" type="button" onClick={() => setIsBoardFormOpen(true)}>
                    Create your first board
                  </button>
                </div>
              ) : null}

              <div className="notes-board-list">
                {boards.map((board) => {
                  const isActiveBoard = activeBoard?.id === board.id
                  const sortedBoardPages = board.pages.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
                  return (
                    <div className="notes-board-card" key={board.id}>
                      <button
                        className={isActiveBoard ? 'notes-board-card__button notes-board-card__button--active' : 'notes-board-card__button'}
                        type="button"
                        onClick={() => { void handleSelectBoard(board.id) }}
                      >
                        <span>{board.name}</span>
                        <small>{board.pages.length} {board.pages.length === 1 ? 'page' : 'pages'}</small>
                      </button>

                      {isActiveBoard ? (
                        <div className="notes-page-list">
                          {sortedBoardPages.map((page) => (
                            <button
                              key={page.id}
                              className={activePageSummary?.id === page.id ? 'notes-page-list__button notes-page-list__button--active' : 'notes-page-list__button'}
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

          <section className="notes-shell__content">
            <section className="notes-panel notes-panel--content">
              {activeBoard ? (
                <>
                  <div className="notes-content__header">
                    <div>
                      <span className="preview-label">Active board</span>
                      <h2>{activeBoard.name}</h2>
                      <p>{pages.length === 0 ? 'No pages yet.' : `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} ready.`}</p>
                    </div>
                    <button
                      className="primary-button notes-header__action"
                      type="button"
                      onClick={() => setIsPageFormOpen((current) => !current)}
                    >
                      <Plus size={18} />
                      New page
                    </button>
                  </div>

                  {isPageFormOpen ? (
                    <form
                      className="notes-form notes-form--inline"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const name = newPageName.trim()
                        if (name && activeBoard) createPage.mutate({ boardId: activeBoard.id, name })
                      }}
                    >
                      <label htmlFor="note-page-name">Page name</label>
                      <input
                        id="note-page-name"
                        value={newPageName}
                        onChange={(event) => setNewPageName(event.target.value)}
                        placeholder="Week 1 reflections"
                        maxLength={240}
                        autoFocus
                      />
                      <div className="notes-form__actions">
                        <button type="button" className="notes-button notes-button--ghost" onClick={() => setIsPageFormOpen(false)}>Cancel</button>
                        <button type="submit" className="notes-button notes-button--primary" disabled={createPage.isPending || !newPageName.trim()}>
                          Create page
                        </button>
                      </div>
                      {pageError ? <p className="flashcard-status flashcard-status--error">{pageError}</p> : null}
                    </form>
                  ) : null}

                  {pages.length === 0 ? (
                    <div className="empty-panel notes-empty-panel notes-empty-panel--content">
                      <FilePenLine size={30} />
                      <h2>No pages in this board yet</h2>
                      <p>Create the first page and FluentA will open it immediately with a blank draft.</p>
                      <button className="primary-button" type="button" onClick={() => setIsPageFormOpen(true)}>
                        Create first page
                      </button>
                    </div>
                  ) : null}

                  {pages.length > 0 && activePageSummary ? (
                    <div className="notes-detail">
                      {pageQuery.isLoading || isOpeningPage ? <p className="flashcard-status">Loading note page...</p> : null}
                      {pageQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load note page.</p> : null}

                      {activePage ? (
                        <>
                          <div className="notes-detail__meta">
                            <span>{formatDate(activePage.date)}</span>
                            <span>Updated {formatDate(activePage.updatedAt)}</span>
                          </div>
                          <div className="notes-editor-toolbar">
                            <div className="notes-editor-toolbar__copy">
                              <span className="preview-label">Editable note</span>
                              <p>Blur saves your draft. Switching pages saves first, then opens the next note.</p>
                            </div>
                            <button
                              className="primary-button notes-header__action"
                              type="button"
                              disabled={isSaving || !isDirty || !title.trim()}
                              onClick={() => { void persistDraft() }}
                            >
                              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              {saveStatus === 'error' ? 'Retry save' : 'Save'}
                            </button>
                          </div>

                          {pageError ? <p className="flashcard-status flashcard-status--error">{pageError}</p> : null}

                          <input
                            aria-label="Note title"
                            className="notes-title-input"
                            data-testid="note-title-input"
                            disabled={isOpeningPage}
                            maxLength={240}
                            value={title}
                            onBlur={() => { void persistDraft() }}
                            onChange={(event) => {
                              setTitle(event.target.value)
                              markChanged()
                            }}
                          />

                          <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                            <div className="notes-editor-shell">
                              <JournalRichTextEditor
                                disabled={isOpeningPage}
                                content={content}
                                onBlur={() => { void persistDraft() }}
                                onChange={(html) => {
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

                          <div className="notes-editor-footer">
                            <div className="notes-editor-footer__stats">
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
                <div className="empty-panel notes-empty-panel notes-empty-panel--content">
                  <Layers3 size={30} />
                  <h2>Select a board to begin</h2>
                  <p>Choose a board from the left to browse its pages and open note detail.</p>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
