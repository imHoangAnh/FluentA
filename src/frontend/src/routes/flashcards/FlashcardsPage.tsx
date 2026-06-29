import { ArrowLeft, BarChart3, BookOpen, Layers, LogOut, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import type { FlashcardDeck } from '../../lib/api/flashcard.api'
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

type FlashcardsPageProps = {
  entryMode?: 'flashcards' | 'practice'
}

export function FlashcardsPage({ entryMode = 'flashcards' }: FlashcardsPageProps) {
  const logout = useAuthStore((state) => state.logout)
  useFlashcardSync()
  const decksQuery = useQuery({
    queryKey: ['flashcard', 'decks'],
    queryFn: flashcardApi.listDecks,
    refetchInterval: 1500,
  })
  const boardGroups = useMemo(() => groupByBoard(decksQuery.data ?? []), [decksQuery.data])
  const cardCount = useMemo(
    () => (decksQuery.data ?? []).reduce((total, deck) => total + deck.cards.length, 0),
    [decksQuery.data],
  )
  const practiceEntry = entryMode === 'practice'

  return (
    <main className="workspace flashcard-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/vocabulary">
            <ArrowLeft size={17} /> Vocabulary
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/settings/review">
            <Settings size={17} /> Review settings
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/flashcards/practice">
            <BookOpen size={17} /> Practice
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/flashcards/review">
            <Layers size={17} /> Review
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      <section className="flashcard-hero">
        <div>
          <span className="preview-label">{practiceEntry ? 'Practice' : 'Flashcards'}</span>
          <h1>{practiceEntry ? 'Choose a page deck to practice' : 'Your page decks'}</h1>
          <p>{practiceEntry ? 'Practice stays page-deck scoped. Pick one deck, then run the configured mode sequence before FluentA seeds or resets review state.' : "Choose a page deck to open the read-only flashcard viewer, then continue into practice when you're ready."}</p>
        </div>
        <div className="flashcard-summary" aria-label="Flashcard summary">
          <Layers size={22} />
          <strong>{decksQuery.data?.length ?? 0} decks</strong>
          <span>{cardCount} synchronized cards</span>
        </div>
      </section>

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
                      <span className="deck-type">Page deck</span>
                      <h3>{deck.name}</h3>
                    </div>
                    <strong>{deck.cards.length}</strong>
                  </header>

                  {deck.cards.length > 0 ? (
                    <div className="deck-actions">
                      {practiceEntry ? (
                        <>
                          <Link className="primary-button deck-practice-link" to={`/flashcards/decks/${deck.id}/practice`}>
                            Practice this Page Deck
                          </Link>
                          <Link className="secondary-button deck-review-link" to={`/flashcards/decks/${deck.id}`}>
                            Open Flashcards
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link className="primary-button deck-review-link" to={`/flashcards/decks/${deck.id}`}>
                            Open Flashcards
                          </Link>
                          <Link className="secondary-button deck-practice-link" to={`/flashcards/decks/${deck.id}/practice`}>
                            Practice this Page Deck
                          </Link>
                        </>
                      )}
                    </div>
                  ) : null}

                  {deck.cards.length === 0 ? <p className="deck-empty">No synchronized cards yet.</p> : null}
                  <p className="deck-summary">{deck.cards.length} synchronized words are ready in this page deck.</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
