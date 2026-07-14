import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as reviewApi from '@/features/review'

type FilterMode = 'all' | 'active' | 'inactive'

export function LevelFiveSettingsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const levelFiveQuery = useQuery({ queryKey: ['review', 'level-five'], queryFn: reviewApi.listLevelFiveWords })
  const removeMutation = useMutation({
    mutationFn: reviewApi.removeLevelFiveWords,
    onSuccess: (_, wordIds) => {
      queryClient.setQueryData(['review', 'level-five'], (current: reviewApi.LevelFiveReviewItem[] | undefined) =>
        current?.map((item) => wordIds.includes(item.wordId) ? { ...item, status: 'inactive' as const } : item) ?? current)
      setSelected([])
    },
  })

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (levelFiveQuery.data ?? []).filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      if (query.length > 0 && !item.word.toLowerCase().includes(query)) return false
      return true
    })
  }, [filter, levelFiveQuery.data, search])

  function toggleSelected(wordId: string) {
    setSelected((current) => current.includes(wordId) ? current.filter((item) => item !== wordId) : [...current, wordId])
  }

  return (
    <section className="settings-panel">
      <span className="preview-label">Level 5</span>
      <h2>Manage Level 5 words</h2>
      <p>Search and filter the words that reached Level 5. Active words can be removed back to inactive without deleting their history.</p>

      <div className="deck-actions">
        <button className={filter === 'all' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'active' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setFilter('active')}>Active</button>
        <button className={filter === 'inactive' ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => setFilter('inactive')}>Inactive</button>
      </div>

      <div className="settings-form">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by word" />
        </label>
      </div>

      {levelFiveQuery.isLoading ? <p className="flashcard-status">Loading Level 5 words...</p> : null}
      {levelFiveQuery.isError ? <p className="flashcard-status flashcard-status--error">Unable to load Level 5 words.</p> : null}

      {!levelFiveQuery.isLoading && !levelFiveQuery.isError ? (
        <>
          <div className="deck-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={selected.length === 0 || removeMutation.isPending}
              onClick={() => removeMutation.mutate(selected)}
            >
              Remove selected
            </button>
          </div>

          <div className="settings-sequence-list">
            {filteredItems.map((item) => (
              <div key={item.wordId} className="settings-sequence-item">
                <div>
                  <strong>{item.word}</strong>
                  <p>{item.boardName} / {item.pageName}</p>
                  <small>Status: {item.status}{item.lastReviewDate ? ` • ${new Date(item.lastReviewDate).toLocaleDateString()}` : ''}</small>
                </div>
                <div className="deck-actions">
                  {item.status === 'active' ? (
                    <>
                      <input type="checkbox" checked={selected.includes(item.wordId)} onChange={() => toggleSelected(item.wordId)} aria-label={`Select ${item.word}`} />
                      <button className="secondary-button" type="button" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate([item.wordId])}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="preview-label">Inactive</span>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 ? <p className="flashcard-status">No Level 5 words match this filter yet.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
