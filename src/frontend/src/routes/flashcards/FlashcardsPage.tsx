import { ArrowLeft, BookOpen, CalendarClock, Flame, Layers, LogOut, Settings, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardDeck } from '../../lib/api/flashcard.api'
import { getLanguageProfile } from '../../lib/language'
import { useFlashcardSync } from '../../lib/realtime/useFlashcardSync'
import { useAuthStore } from '../../stores/authStore'

function groupByBoard(decks: FlashcardDeck[]) {
  const groups = new Map<string, { name: string; decks: FlashcardDeck[] }>()
  for (const deck of decks) {
    const group = groups.get(deck.boardId) ?? { name: deck.boardName, decks: [] }
    group.decks.push(deck)
    groups.set(deck.boardId, group)
  }

  return [...groups.entries()]
}

function displayReviewDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not scheduled'
}

export function FlashcardsPage() {
  const logout = useAuthStore((state) => state.logout)
  useFlashcardSync()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const decksQuery = useQuery({
    queryKey: ['flashcard', 'decks'],
    queryFn: flashcardApi.listDecks,
    refetchInterval: 1500,
  })
  const dashboardQuery = useQuery({
    queryKey: ['flashcard', 'dashboard'],
    queryFn: () => flashcardApi.getDashboard(timeZone),
    refetchInterval: 1500,
  })
  const boardGroups = useMemo(() => groupByBoard(decksQuery.data ?? []), [decksQuery.data])
  const cardCount = useMemo(
    () => (decksQuery.data ?? []).reduce((total, deck) => total + deck.cards.length, 0),
    [decksQuery.data],
  )
  const dashboard = dashboardQuery.data
  const maxForecast = Math.max(1, ...(dashboard?.forecast.map((point) => point.dueCount) ?? [0]))

  return (
    <main className="workspace flashcard-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <ArrowLeft size={17} /> Vocabulary
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/settings/review">
            <Settings size={17} /> Review settings
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      <section className="flashcard-hero">
        <div>
          <span className="preview-label">Flashcards</span>
          <h1>Your synchronized decks</h1>
          <p>Read-only cards stay aligned with your vocabulary pages and refresh as words change.</p>
        </div>
        <div className="flashcard-summary" aria-label="Flashcard summary">
          <Layers size={22} />
          <strong>{decksQuery.data?.length ?? 0} decks</strong>
          <span>{cardCount} synchronized cards</span>
        </div>
      </section>

      {dashboard ? (
        <section className="flashcard-dashboard" aria-label="Flashcard dashboard">
          <article data-testid="dashboard-streak">
            <Flame size={20} />
            <span>Streak</span>
            <strong>{dashboard.streakDays} day{dashboard.streakDays === 1 ? '' : 's'}</strong>
          </article>
          <article data-testid="dashboard-retention">
            <TrendingUp size={20} />
            <span>Retention</span>
            <strong>{dashboard.retentionRate}%</strong>
          </article>
          <article data-testid="dashboard-due">
            <CalendarClock size={20} />
            <span>Due today</span>
            <strong>{dashboard.overdue + dashboard.dueToday}</strong>
            <small>{dashboard.overdue} overdue · {dashboard.newCards} new</small>
          </article>
          <article className="flashcard-dashboard__forecast" data-testid="dashboard-forecast">
            <span>7-day forecast</span>
            <div>
              {dashboard.forecast.map((point) => (
                <div className="forecast-bar" key={point.date}>
                  <span style={{ height: `${Math.max(8, (point.dueCount / maxForecast) * 58)}px` }} />
                  <small>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${point.date}T00:00:00`))}</small>
                  <strong>{point.dueCount}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
      {dashboardQuery.isError ? <p className="flashcard-status flashcard-status--error">Unable to load dashboard stats.</p> : null}

      {decksQuery.isLoading ? <p className="flashcard-status">Loading flashcards...</p> : null}
      {decksQuery.isError ? <p className="flashcard-status flashcard-status--error">Unable to load flashcards.</p> : null}
      {!decksQuery.isLoading && !decksQuery.isError && boardGroups.length === 0 ? (
        <div className="empty-panel flashcard-empty">
          <BookOpen size={28} />
          <h2>No decks yet</h2>
          <p>Create a vocabulary board and page, then add words to see synchronized cards here.</p>
          <Link className="primary-button flashcard-empty__link" to="/">Open vocabulary</Link>
        </div>
      ) : null}

      <div className="flashcard-boards">
        {boardGroups.map(([boardId, board]) => (
          <section className="flashcard-board" key={boardId}>
            <div className="flashcard-board__heading">
              <div>
                <span className="preview-label">Vocabulary board</span>
                <h2>{board.name}</h2>
              </div>
              <span>{board.decks.length} decks</span>
            </div>

            <div className="flashcard-decks">
              {board.decks.map((deck) => (
                <article className="flashcard-deck" key={deck.id} data-testid={`flashcard-deck-${deck.id}`}>
                  <header className="flashcard-deck__heading">
                    <div>
                      <span className="deck-type">{deck.type === 'AllWords' ? 'All words' : 'Page deck'}</span>
                      <h3>{deck.name}</h3>
                    </div>
                    <strong>{deck.cards.length}</strong>
                  </header>

                  {deck.cards.length > 0 ? (
                    <Link className="primary-button deck-review-link" to={`/flashcards/decks/${deck.id}/review`}>
                      {deck.type === 'AllWords' ? 'Study All Words' : 'Study this Page Deck'}
                    </Link>
                  ) : null}

                  {deck.cards.length === 0 ? <p className="deck-empty">No synchronized cards yet.</p> : null}
                  <div className="flashcard-list">
                    {deck.cards.map((card) => (
                      <section className="flashcard-card" key={card.id} data-testid={`flashcard-word-${card.word}`}>
                        <div className="flashcard-card__topline">
                          <div>
                            <span>{card.wordClass}</span>
                            <h4>{card.word}</h4>
                          </div>
                          <span className={`card-state card-state--${card.state}`}>{card.state}</span>
                        </div>
                        <dl>
                          <div><dt>Vietnamese</dt><dd>{card.meaningVn}</dd></div>
                          <div><dt>{getLanguageProfile(deck.boardLanguage).secondaryMeaningLabel}</dt><dd>{card.meaningEn}</dd></div>
                          <div><dt>Example</dt><dd>{card.example}</dd></div>
                        </dl>
                        <footer>
                          <CalendarClock size={15} />
                          <span>{displayReviewDate(card.nextReviewDate)}</span>
                          <span>{card.repetitions} reviews</span>
                        </footer>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
