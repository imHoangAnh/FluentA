import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import {
  BookOpen, CalendarClock, CheckSquare, ChevronDown, ChevronUp, Columns3,
  Globe, HelpCircle, Kanban, Layers, LogOut,
  NotebookPen, Plus, Repeat2, Settings, Timer,
} from 'lucide-react'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import { getUserAvatarUrl } from '../../lib/avatar'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardDeck } from '../../lib/api/flashcard.api'
import { useFlashcardSync } from '../../lib/realtime/useFlashcardSync'
import { useAuthStore } from '../../stores/authStore'
import '../dashboard/DashboardPage.css'

function groupByBoard(decks: FlashcardDeck[]) {
  const groups = new Map<string, { name: string; decks: FlashcardDeck[] }>()
  for (const deck of decks) {
    const group = groups.get(deck.boardId) ?? { name: deck.boardName, decks: [] }
    group.decks.push(deck)
    groups.set(deck.boardId, group)
  }

  return [...groups.entries()]
}

type FlashcardsPageProps = {
  entryMode?: 'flashcards' | 'practice'
}

export function FlashcardsPage({ entryMode = 'flashcards' }: FlashcardsPageProps) {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  useFlashcardSync()
  const decksQuery = useQuery({
    queryKey: ['flashcard', 'decks'],
    queryFn: flashcardApi.listDecks,
    refetchInterval: 1500,
  })
  const boardGroups = useMemo(() => groupByBoard(decksQuery.data ?? []), [decksQuery.data])

  const practiceEntry = entryMode === 'practice'

  /* Track which boards are expanded; if null, first board defaults open */
  const [expandedBoards, setExpandedBoards] = useState<Set<string> | null>(null)

  const toggleBoard = useCallback(
    (boardId: string) => {
      setExpandedBoards((prev) => {
        const next = prev !== null ? new Set(prev) : (boardGroups.length > 0 ? new Set([boardGroups[0][0]]) : new Set<string>())
        if (next.has(boardId)) {
          next.delete(boardId)
        } else {
          next.add(boardId)
        }
        return next
      })
    },
    [boardGroups],
  )

  return (
    <div className="dashboard-layout">
      {/* ── Left Sidebar Navigation ── */}
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
            <BookOpen size={20} /> Vocabulary
          </Link>
          <LearningNavLinks />
          <Link to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            <CheckSquare size={20} /> Todo
          </Link>
          <Link to="/habits" className={location.pathname === '/habits' ? 'active' : ''}>
            <Repeat2 size={20} /> Habits
          </Link>
          <Link to="/countdown" className={location.pathname === '/countdown' ? 'active' : ''}>
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
            <img
              className="dashboard-user-avatar"
              src={avatarUrl}
              alt="User"
            />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="dashboard-main">
        <div className="fc-expand-content">
          {/* Header Section */}
          <div className="fc-expand-header">
            <h2 className="fc-expand-title">{practiceEntry ? 'Choose a page deck to practice' : 'Your page decks'}</h2>
          </div>

          {/* Loading / Error States */}
          {decksQuery.isLoading ? <p className="flashcard-status">Loading flashcards...</p> : null}
          {decksQuery.isError ? <p className="flashcard-status flashcard-status--error">Unable to load flashcards.</p> : null}
          {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? (
            <div className="empty-panel flashcard-empty">
              <BookOpen size={28} />
              <h2>No decks yet</h2>
              <p>Create a vocabulary board and page, then add words to see synchronized cards here.</p>
              <Link className="primary-button flashcard-empty__link" to="/vocabulary">Open vocabulary</Link>
            </div>
          ) : null}

          {/* Boards Container */}
          <div className="fc-expand-boards">
            {boardGroups.map(([boardId, board], index) => {
              const expanded = expandedBoards !== null ? expandedBoards.has(boardId) : index === 0
              return (
                <section className="fc-expand-board" key={boardId}>
                  {/* Board Header (Toggle) */}
                  <button
                    className="fc-expand-board__toggle"
                    type="button"
                    onClick={() => toggleBoard(boardId)}
                    aria-expanded={expanded}
                  >
                    <div className="fc-expand-board__title-wrap">
                      <Layers className="fc-expand-board__icon" size={20} />
                      <div>
                        <span className="fc-expand-board__label">Vocabulary Board</span>
                        <h3 className="fc-expand-board__name">{board.name}</h3>
                      </div>
                    </div>
                    <div className="fc-expand-board__meta">
                      <span className="fc-expand-board__count">{board.decks.length} {board.decks.length === 1 ? 'deck' : 'decks'}</span>
                      <span className="fc-expand-board__chevron">
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </span>
                    </div>
                  </button>

                  {/* Board Content (Decks Grid) */}
                  {expanded ? (
                    <div className="fc-expand-board__content">
                      <div className="fc-expand-decks-grid">
                        {board.decks.map((deck) => (
                          <article
                            className={`fc-expand-deck${deck.cards.length > 0 ? ' fc-expand-deck--has-cards' : ''}`}
                            key={deck.id}
                            data-testid={`flashcard-deck-${deck.id}`}
                          >
                            {/* Top accent bar for decks with cards */}
                            {deck.cards.length > 0 ? <div className="fc-expand-deck__accent" /> : null}

                            <div className="fc-expand-deck__header">
                              <div>
                                <span className="fc-expand-deck__type">Page Deck</span>
                                <h4 className="fc-expand-deck__name">{deck.name}</h4>
                              </div>
                              <div className={`fc-expand-deck__badge${deck.cards.length > 0 ? ' fc-expand-deck__badge--active' : ''}`}>
                                {deck.cards.length}
                              </div>
                            </div>

                            <p className="fc-expand-deck__desc">
                              {deck.cards.length > 0
                                ? `${deck.cards.length} synchronized words are ready in this page deck.`
                                : 'No synchronized cards yet.'}
                            </p>

                            <div className="fc-expand-deck__actions">
                              {deck.cards.length > 0 ? (
                                <>
                                  {practiceEntry ? (
                                    <>
                                      <Link className="fc-expand-deck__btn fc-expand-deck__btn--primary" to={`/flashcards/decks/${deck.id}/practice`}>
                                        Practice this Page Deck
                                      </Link>
                                      <Link className="fc-expand-deck__btn fc-expand-deck__btn--secondary" to={`/flashcards/decks/${deck.id}`}>
                                        Open Flashcards
                                      </Link>
                                    </>
                                  ) : (
                                    <>
                                      <Link className="fc-expand-deck__btn fc-expand-deck__btn--primary" to={`/flashcards/decks/${deck.id}`}>
                                        Open Flashcards
                                      </Link>
                                      <Link className="fc-expand-deck__btn fc-expand-deck__btn--secondary" to={`/flashcards/decks/${deck.id}/practice`}>
                                        Practice this Page Deck
                                      </Link>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button className="fc-expand-deck__btn fc-expand-deck__btn--disabled" type="button" disabled>
                                    Open Flashcards
                                  </button>
                                  <Link className="fc-expand-deck__btn fc-expand-deck__btn--secondary fc-expand-deck__btn--add" to="/vocabulary">
                                    <Plus size={16} /> Add Cards
                                  </Link>
                                </>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
