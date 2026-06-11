import { BarChart3, BookOpen, CalendarDays, FilePlus2, Loader2, NotebookPen, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as journalApi from '../../lib/api/journal.api'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function JournalPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [learningDate, setLearningDate] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const openRequestRef = useRef(0)

  const entriesQuery = useQuery({
    queryKey: ['journal', 'entries'],
    queryFn: journalApi.listJournalEntries,
  })

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  const clearEditor = () => {
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setTitle('')
    setContent('')
    setLearningDate('')
  }

  const selectEntry = (entry: journalApi.JournalEntry) => {
    setSelectedId(entry.id)
    setTitle(entry.title)
    setContent(entry.content)
    setLearningDate(entry.learningDate ?? '')
  }

  const openEntry = async (entry: journalApi.JournalEntrySummary) => {
    const requestId = openRequestRef.current + 1
    openRequestRef.current = requestId
    setOpeningId(entry.id)
    setOpenFailed(false)
    setSelectedId(entry.id)
    try {
      const fullEntry = await queryClient.fetchQuery({
        queryKey: ['journal', 'entry', entry.id],
        queryFn: () => journalApi.getJournalEntry(entry.id),
      })
      if (openRequestRef.current === requestId) selectEntry(fullEntry)
    } catch {
      if (openRequestRef.current === requestId) setOpenFailed(true)
    } finally {
      if (openRequestRef.current === requestId) setOpeningId(null)
    }
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['journal'] })
  }

  const createEntry = useMutation({
    mutationFn: journalApi.createJournalEntry,
    onSuccess: async (entry) => {
      queryClient.setQueryData(['journal', 'entry', entry.id], entry)
      selectEntry(entry)
      await refresh()
    },
  })

  const updateEntry = useMutation({
    mutationFn: (input: { id: string; patch: journalApi.UpdateJournalEntryInput }) =>
      journalApi.updateJournalEntry(input.id, input.patch),
    onSuccess: async (entry) => {
      queryClient.setQueryData(['journal', 'entry', entry.id], entry)
      selectEntry(entry)
      await refresh()
    },
  })

  const deleteEntry = useMutation({
    mutationFn: journalApi.deleteJournalEntry,
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: ['journal', 'entry', id] })
      clearEditor()
      await refresh()
    },
  })

  const isSaving = createEntry.isPending || updateEntry.isPending
  const isOpening = openingId !== null

  function submitEntry(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    if (selectedId) {
      updateEntry.mutate({ id: selectedId, patch: { title, content, learningDate } })
      return
    }

    createEntry.mutate({ title, content, learningDate: learningDate || null })
  }

  return (
    <main className="workspace journal-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Journal navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/vocabulary">
            <BookOpen size={17} /> Vocabulary
          </Link>
        </nav>
      </header>

      <section className="journal-shell">
        <div className="journal-hero">
          <div>
            <span className="preview-label">Journal Pages</span>
            <h1>Language learning notes</h1>
            <p>Capture Unicode notes now. Rich text and auto-save arrive in the next Journal slice.</p>
          </div>
          <NotebookPen size={38} />
        </div>

        <div className="journal-layout">
          <aside className="journal-list-panel">
            <header>
              <div>
                <span className="preview-label">Entries</span>
                <h2>{entries.length} journal {entries.length === 1 ? 'entry' : 'entries'}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="New journal entry" onClick={clearEditor}>
                <FilePlus2 size={18} />
              </button>
            </header>

            {entriesQuery.isLoading ? <p className="flashcard-status">Loading journal entries...</p> : null}
            {entriesQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load journal entries.</p> : null}
            {!entriesQuery.isLoading && !entriesQuery.isError && entries.length === 0 ? (
              <div className="empty-panel journal-empty">
                <NotebookPen size={28} />
                <h2>No journal entries yet</h2>
                <p>Write one thought from today's language practice.</p>
              </div>
            ) : null}

            <div className="journal-entry-list">
              {entries.map((entry) => (
                <button
                  className={selectedId === entry.id ? 'journal-entry-card journal-entry-card--active' : 'journal-entry-card'}
                  type="button"
                  key={entry.id}
                  onClick={() => void openEntry(entry)}
                  aria-label={`Open journal ${entry.title}`}
                >
                  <strong>{entry.title}</strong>
                  <span>{formatDate(entry.createdAt)}</span>
                  <p>{entry.preview || 'No content yet.'}</p>
                  {entry.learningDate ? <small><CalendarDays size={14} /> Learning date {entry.learningDate}</small> : null}
                </button>
              ))}
            </div>
          </aside>

          <form className="journal-editor" onSubmit={submitEntry}>
            <header>
              <div>
                <span className="preview-label">{selectedId ? 'Edit entry' : 'New entry'}</span>
                <h2>{selectedId ? 'Keep shaping this note' : 'Capture a learning moment'}</h2>
              </div>
              {selectedId ? (
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label={`Delete journal ${title}`}
                  disabled={deleteEntry.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete "${title}"?`)) deleteEntry.mutate(selectedId)
                  }}
                >
                  <Trash2 size={18} />
                </button>
              ) : null}
            </header>

            <label>
              Title
              <input
                data-testid="journal-title-input"
                disabled={isOpening}
                value={title}
                maxLength={240}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What did you learn today?"
              />
            </label>

            <label>
              Learning date
              <input
                data-testid="journal-learning-date-input"
                disabled={isOpening}
                value={learningDate}
                type="date"
                onChange={(event) => setLearningDate(event.target.value)}
              />
            </label>

            <label>
              Content
              <textarea
                data-testid="journal-content-input"
                disabled={isOpening}
                value={content}
                maxLength={100_000}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write in any language..."
              />
            </label>

            <footer>
              <small>{content.length.toLocaleString()} / 100,000 characters</small>
              <button className="primary-button" type="submit" disabled={isSaving || isOpening || !title.trim()} data-testid="save-journal-button">
                {isSaving || isOpening ? <Loader2 size={18} /> : <Save size={18} />} {selectedId ? 'Save changes' : 'Create entry'}
              </button>
            </footer>

            {openFailed || createEntry.isError || updateEntry.isError || deleteEntry.isError ? (
              <p className="flashcard-status flashcard-status--error">The journal entry could not be saved.</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  )
}
