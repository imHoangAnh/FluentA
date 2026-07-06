import { LogOut } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ColumnSettings } from '../../components/vocabulary/ColumnSettings'
import { VocabTable } from '../../components/vocabulary/VocabTable'
import * as vocabularyApi from '../../lib/api/vocabulary.api'
import { supportedLanguageProfiles } from '../../lib/language'
import { useAuthStore } from '../../stores/authStore'
import './WorkspacePage.css'

export function WorkspacePage() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardLanguage, setNewBoardLanguage] = useState('en')

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
  const sortedBoards = useMemo(
    () => boards.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [boards],
  )
  const sortedPages = useMemo(
    () => (activeBoard?.pages ?? []).toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [activeBoard?.pages],
  )
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      setSelectedBoardId(board.id)
      setNewBoardName('')
      setNewBoardLanguage('en')
      setIsCreatingBoard(false)
      await queryClient.invalidateQueries({ queryKey: ['vocab', 'boards'] })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async () => {
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
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(['vocab', 'boards', activeBoardId], (current) => (
        current ? { ...current, preferences } : current
      ))
    },
  })

  return (
    <main className="vw-layout">
      <aside className="vw-sidebar">
        <div className="vw-sidebar-header">
          <Link to="/" className="vw-back-btn" title="Back to Overview">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          </Link>
          <div className="vw-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu_book</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>FluentA</span>
        </div>

        <div className="vw-boards-section">
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Boards</h3>
          <button
            className="vw-icon-btn"
            style={{ border: 'none', width: '28px', height: '28px', color: '#0D9488' }}
            title="Create new board"
            onClick={() => setIsCreatingBoard((current) => !current)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          </button>
        </div>

        {isCreatingBoard ? (
          <form
            className="vw-create-board-form"
            onSubmit={(event) => {
              event.preventDefault()
              const name = newBoardName.trim()
              if (name) createBoard.mutate({ name, language: newBoardLanguage })
            }}
          >
            <label htmlFor="new-board-name">Board name</label>
            <input
              id="new-board-name"
              value={newBoardName}
              onChange={(event) => setNewBoardName(event.target.value)}
              maxLength={120}
              autoFocus
              required
            />
            <label htmlFor="new-board-language">Language</label>
            <select
              id="new-board-language"
              data-testid="board-language-select"
              value={newBoardLanguage}
              onChange={(event) => setNewBoardLanguage(event.target.value)}
            >
              {supportedLanguageProfiles.map((profile) => (
                <option key={profile.code} value={profile.code}>{profile.name}</option>
              ))}
            </select>
            <div className="vw-create-board-actions">
              <button type="button" onClick={() => setIsCreatingBoard(false)}>Cancel</button>
              <button type="submit" disabled={createBoard.isPending || !newBoardName.trim()}>Create</button>
            </div>
          </form>
        ) : null}

        <div className="vw-boards-list">
          {sortedBoards.map((board) => (
            <div key={board.id}>
              <button
                className="vw-board-group-btn"
                onClick={() => {
                  if (selectedBoardId === board.id) {
                    setSelectedBoardId(null)
                  } else {
                    setSelectedBoardId(board.id)
                    setSelectedPageId(null)
                  }
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '16px',
                    color: '#6d7a77',
                    transition: 'transform 0.2s',
                    transform: (selectedBoardId === board.id || activeBoardId === board.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  expand_more
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {board.name}
                </span>
              </button>

              {activeBoard?.id === board.id ? (
                <div className="vw-page-list">
                  {sortedPages.map((page) => (
                    <button
                      key={page.id}
                      className={`vw-page-btn ${activePage?.id === page.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBoardId(board.id)
                        setSelectedPageId(page.id)
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.7 }}>description</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.name}</span>
                    </button>
                  ))}
                  <button
                    className="vw-page-btn"
                    style={{ color: '#0D9488', fontSize: '13px' }}
                    onClick={() => {
                      const name = window.prompt('New page name:')
                      if (name) createPage.mutate({ boardId: board.id, name })
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> Add Page
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>

      <section className="vw-main">
        <header className="vw-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6d7a77', fontSize: '14px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
            <span>/</span>
            <span>Boards</span>
            <span>/</span>
            <span style={{ color: '#191c1e', fontWeight: 500 }}>{activePage?.name || 'Overview'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="vw-icon-btn" style={{ border: 'none' }} title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="vw-icon-btn" style={{ border: 'none' }} title="Logout" onClick={() => void logout()}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {activeBoard && activePage ? (
          <>
            <div className="vw-content-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{activePage.name}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="vw-icon-btn" title="Toggle View">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>grid_view</span>
                </button>
                <div style={{ height: '24px', width: '1px', backgroundColor: '#e0e3e5', margin: '0 4px' }} />
                <ColumnSettings
                  preferences={activeBoard.preferences}
                  onSave={async (preferences) => { await updatePreferences.mutateAsync(preferences) }}
                />
              </div>
            </div>

            <div className="vw-content-area">
              <VocabTable
                key={`${activeBoard.id}:${activeBoard.preferences.updatedAt ?? 'default'}`}
                boardId={activeBoard.id}
                page={activePage}
                preferences={activeBoard.preferences}
                onPreferencesChange={async (preferences) => { await updatePreferences.mutateAsync(preferences) }}
              />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6d7a77' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px' }}>menu_book</span>
            <h2>Select a page to view vocabulary</h2>
          </div>
        )}
      </section>
    </main>
  )
}
