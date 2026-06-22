import { LogOut } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from '../../lib/api/vocabulary.api'
import { useAuthStore } from '../../stores/authStore'
import { VocabTable } from '../../components/vocabulary/VocabTable'
import { ColumnSettings } from '../../components/vocabulary/ColumnSettings'
import { Link } from 'react-router-dom'
import './WorkspacePage.css'

export function WorkspacePage() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)

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
    () => boards.toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [boards],
  )
  const sortedPages = useMemo(
    () => (activeBoard?.pages ?? []).toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [activeBoard?.pages],
  )
  
  // Try to use selectedPageId if it belongs to the active board, otherwise fallback to the first page of active board
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      setSelectedBoardId(board.id)
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

  return (
    <main className="vw-layout">
      {/* Left Sidebar */}
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
            onClick={() => {
              const name = window.prompt("New board name:")
              if (name) createBoard.mutate({ name, language: 'en' })
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          </button>
        </div>

        <div className="vw-boards-list">
          {sortedBoards.map(board => (
            <div key={board.id}>
              <button 
                className="vw-board-group-btn" 
                onClick={() => {
                  if (selectedBoardId === board.id) {
                    // Toggle off if already selected
                    setSelectedBoardId(null)
                  } else {
                    setSelectedBoardId(board.id)
                    setSelectedPageId(null) // Reset page selection on board change
                  }
                }}
              >
                <span 
                  className="material-symbols-outlined" 
                  style={{ 
                    fontSize: '16px', 
                    color: '#6d7a77', 
                    transition: 'transform 0.2s', 
                    transform: (selectedBoardId === board.id || activeBoardId === board.id) ? 'rotate(0deg)' : 'rotate(-90deg)' 
                  }}
                >
                  expand_more
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {board.name}
                </span>
              </button>
              
              {activeBoard?.id === board.id && (
                <div className="vw-page-list">
                  {sortedPages.map(page => (
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
                      const name = window.prompt("New page name:")
                      if (name) createPage.mutate({ boardId: board.id, name })
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> Add Page
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
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
                <div style={{ height: '24px', width: '1px', backgroundColor: '#e0e3e5', margin: '0 4px' }}></div>
                <ColumnSettings boardId={activeBoard.id} />
              </div>
            </div>

            <div className="vw-content-area">
              <VocabTable boardId={activeBoard.id} page={activePage} boardLanguage={activeBoard.language} />
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
