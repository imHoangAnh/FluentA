import { BarChart3, BookOpen, CalendarClock, CheckSquare, FilePlus2, Languages, Layers, LogOut, NotebookPen, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from '../../lib/api/vocabulary.api'
import { useAuthStore } from '../../stores/authStore'
import { VocabTable } from '../../components/vocabulary/VocabTable'
import { Link } from 'react-router-dom'

export function WorkspacePage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [boardName, setBoardName] = useState('')
  const [boardLanguage, setBoardLanguage] = useState('en')
  const [pageName, setPageName] = useState('')
  const [draftBoards, setDraftBoards] = useState<Record<string, { name: string; language: string }>>({})
  const [draftPageNames, setDraftPageNames] = useState<Record<string, string>>({})

  const boardsQuery = useQuery({
    queryKey: ['vocab', 'boards'],
    queryFn: vocabularyApi.listBoards,
  })

  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data])
  const activeBoardId = selectedBoardId ?? boards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: ['vocab', 'boards', activeBoardId],
    queryFn: () => vocabularyApi.getBoard(activeBoardId!),
    enabled: Boolean(activeBoardId),
  })

  const activeBoard = boardQuery.data
  const activeBoardDraft = activeBoard ? (draftBoards[activeBoard.id] ?? activeBoard) : null
  const sortedBoards = useMemo(
    () => boards.toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [boards],
  )
  const sortedPages = useMemo(
    () => (activeBoard?.pages ?? []).toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [activeBoard?.pages],
  )
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      setSelectedBoardId(board.id)
      setBoardName('')
      setBoardLanguage('en')
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const updateBoard = useMutation({
    mutationFn: (input: { id: string; name: string; language: string; sortOrder?: number }) =>
      vocabularyApi.updateBoard(input.id, input),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards', board.id] })
    },
  })

  const deleteBoard = useMutation({
    mutationFn: vocabularyApi.deleteBoard,
    onSuccess: async () => {
      setSelectedPageId(null)
      setSelectedBoardId(null)
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async () => {
      setPageName('')
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards', activeBoardId] })
    },
  })

  const updatePage = useMutation({
    mutationFn: (input: { boardId: string; pageId: string; name: string; sortOrder: number }) =>
      vocabularyApi.updatePage(input.boardId, input.pageId, { name: input.name, sortOrder: input.sortOrder }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards', activeBoardId] })
    },
  })

  const deletePage = useMutation({
    mutationFn: (input: { boardId: string; pageId: string }) => vocabularyApi.deletePage(input.boardId, input.pageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards', activeBoardId] })
    },
  })

  function submitBoard(event: FormEvent) {
    event.preventDefault()
    createBoard.mutate({ name: boardName, language: boardLanguage })
  }

  function submitPage(event: FormEvent) {
    event.preventDefault()
    if (!activeBoardId) return
    createPage.mutate({ boardId: activeBoardId, name: pageName })
  }

  function saveBoard() {
    if (!activeBoard) return
    updateBoard.mutate({
      id: activeBoard.id,
      name: activeBoardDraft?.name ?? activeBoard.name,
      language: activeBoardDraft?.language ?? activeBoard.language,
      sortOrder: activeBoard.sortOrder,
    })
  }

  function renamePage(pageId: string, fallbackName: string, sortOrder: number) {
    if (!activeBoardId) return
    updatePage.mutate({ boardId: activeBoardId, pageId, name: draftPageNames[pageId] ?? fallbackName, sortOrder })
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link className="ghost-button ghost-button--inline" to="/" data-testid="open-dashboard">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/flashcards" data-testid="open-flashcards">
            <Layers size={17} /> Flashcards
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/todo" data-testid="open-todo">
            <CheckSquare size={17} /> Todo
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/habits" data-testid="open-habits">
            <CheckSquare size={17} /> Habits
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/countdown" data-testid="open-countdown">
            <CalendarClock size={17} /> Countdown
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/journal" data-testid="open-journal">
            <NotebookPen size={17} /> Journal
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      <section className="vocab-layout">
        <aside className="board-sidebar" aria-label="Vocabulary boards">
          <div className="workspace-title">
            <span className="preview-label">Vocabulary Board</span>
            <h1>Boards</h1>
          </div>

          <form className="compact-form" onSubmit={submitBoard}>
            <label>
              Name
              <input
                data-testid="board-name-input"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder="IELTS Vocabulary"
              />
            </label>
            <label>
              Language
              <select
                data-testid="board-language-select"
                value={boardLanguage}
                onChange={(event) => setBoardLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="fr">French</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={createBoard.isPending} data-testid="create-board-button">
              <Plus size={18} /> Create board
            </button>
          </form>

          <div className="board-list">
            {sortedBoards.map((board) => (
              <button
                className={board.id === activeBoardId ? 'board-list__item board-list__item--active' : 'board-list__item'}
                key={board.id}
                type="button"
                onClick={() => {
                  setSelectedBoardId(board.id)
                  setSelectedPageId(null)
                }}
              >
                <BookOpen size={18} />
                <span>{board.name}</span>
                <small>{board.pageCount} pages</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="board-main">
          {boardsQuery.isLoading ? <p className="screen-status">Loading boards...</p> : null}

          {!boardsQuery.isLoading && !activeBoard ? (
            <div className="empty-panel">
              <Languages size={28} />
              <h2>Welcome, {user?.fullName ?? 'learner'}</h2>
              <p>{user?.email}</p>
            </div>
          ) : null}

          {activeBoard ? (
            <>
              <div className="board-toolbar">
                <div>
                  <span className="preview-label">{activeBoard.language}</span>
                  <h2>{activeBoard.name}</h2>
                </div>
                <div className="toolbar-actions">
                <button className="ghost-button ghost-button--inline" type="button" onClick={saveBoard} data-testid="save-board-button">
                    <Save size={17} /> Save
                  </button>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label="Delete board"
                    onClick={() => deleteBoard.mutate(activeBoard.id)}
                    data-testid="delete-board-button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="board-edit">
                <label>
                  Board name
                  <input
                    value={activeBoardDraft?.name ?? activeBoard.name}
                    onChange={(event) =>
                      setDraftBoards((drafts) => ({
                        ...drafts,
                        [activeBoard.id]: {
                          name: event.target.value,
                          language: activeBoardDraft?.language ?? activeBoard.language,
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  Language
                  <select
                    value={activeBoardDraft?.language ?? activeBoard.language}
                    onChange={(event) =>
                      setDraftBoards((drafts) => ({
                        ...drafts,
                        [activeBoard.id]: {
                          name: activeBoardDraft?.name ?? activeBoard.name,
                          language: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="en">English</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="fr">French</option>
                  </select>
                </label>
              </div>

              <form className="page-create" onSubmit={submitPage}>
                <label>
                  Page
                  <input
                    data-testid="page-name-input"
                    value={pageName}
                    onChange={(event) => setPageName(event.target.value)}
                    placeholder="Unit 1 - Education"
                  />
                </label>
                <button className="primary-button" type="submit" disabled={createPage.isPending} data-testid="create-page-button">
                  <FilePlus2 size={18} /> Add page
                </button>
              </form>

              <div className="page-list">
                {sortedPages.map((page) => (
                  <article className="page-row" key={page.id}>
                    <button
                      className={page.id === activePage?.id ? 'page-select page-select--active' : 'page-select'}
                      type="button"
                      onClick={() => setSelectedPageId(page.id)}
                      data-testid={`select-page-${page.id}`}
                    >
                      <Pencil size={18} />
                      <span>{page.name}</span>
                    </button>
                    <input
                      aria-label={`Rename ${page.name}`}
                      value={draftPageNames[page.id] ?? page.name}
                      onChange={(event) => setDraftPageNames((drafts) => ({ ...drafts, [page.id]: event.target.value }))}
                    />
                    <button
                      className="ghost-button ghost-button--inline"
                      type="button"
                      onClick={() => renamePage(page.id, page.name, page.sortOrder)}
                      data-testid={`save-page-${page.id}`}
                    >
                      <Save size={16} /> Save
                    </button>
                    <button
                      className="icon-button icon-button--danger"
                      type="button"
                      aria-label={`Delete ${page.name}`}
                      onClick={() => deletePage.mutate({ boardId: activeBoard.id, pageId: page.id })}
                      data-testid={`delete-page-${page.id}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>

              {activePage ? <VocabTable boardId={activeBoard.id} page={activePage} boardLanguage={activeBoard.language} /> : null}
            </>
          ) : null}
        </section>
      </section>
    </main>
  )
}
