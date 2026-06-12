import { BarChart3, BookOpen, CalendarDays, ChevronLeft, ChevronRight, FilePlus2, Loader2, NotebookPen, Save, Search, Trash2, X } from 'lucide-react'
import { type FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as journalApi from '../../lib/api/journal.api'

const JournalRichTextEditor = lazy(() =>
  import('./JournalRichTextEditor').then((module) => ({ default: module.JournalRichTextEditor })),
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function toMonthInput(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + offset, 1)
  return toMonthInput(date)
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))
}

function buildCalendarDates(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      value: toDateInput(date),
      isCurrentMonth: date.getMonth() === first.getMonth(),
    }
  })
}

function HighlightedPreview({ entry }: { entry: journalApi.JournalEntrySummary | journalApi.JournalSearchResult }) {
  if (!('highlights' in entry) || entry.highlights.length === 0) {
    return <>{entry.preview || 'No content yet.'}</>
  }

  const parts: React.ReactNode[] = []
  let position = 0
  for (const range of entry.highlights) {
    if (range.start > position) parts.push(entry.preview.slice(position, range.start))
    parts.push(<mark key={`${range.start}-${range.length}`}>{entry.preview.slice(range.start, range.start + range.length)}</mark>)
    position = range.start + range.length
  }
  if (position < entry.preview.length) parts.push(entry.preview.slice(position))
  return <>{parts}</>
}

export function JournalPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [learningDate, setLearningDate] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => toMonthInput(new Date()))
  const openRequestRef = useRef(0)
  const draftVersionRef = useRef(0)

  const entriesQuery = useQuery({
    queryKey: ['journal', 'entries'],
    queryFn: journalApi.listJournalEntries,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const searchQueryResult = useQuery({
    queryKey: ['journal', 'search', debouncedSearchQuery],
    queryFn: () => journalApi.searchJournalEntries(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  const calendarQuery = useQuery({
    queryKey: ['journal', 'calendar', calendarMonth],
    queryFn: () => journalApi.getJournalCalendar(calendarMonth),
  })

  const isSearching = searchQuery.trim().length > 0
  const entries = useMemo(
    () => isSearching ? searchQueryResult.data ?? [] : entriesQuery.data ?? [],
    [entriesQuery.data, isSearching, searchQueryResult.data],
  )
  const isListLoading = isSearching
    ? searchQuery.trim() !== debouncedSearchQuery || searchQueryResult.isLoading
    : entriesQuery.isLoading
  const isListError = isSearching ? searchQueryResult.isError : entriesQuery.isError
  const calendarCounts = useMemo(() => new Map((calendarQuery.data ?? []).map((day) => [day.date, day.count])), [calendarQuery.data])
  const calendarDates = useMemo(() => buildCalendarDates(calendarMonth), [calendarMonth])

  const clearEditor = () => {
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setTitle('')
    setContent('')
    setLearningDate('')
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const prepareEntryForDate = (date: string) => {
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setTitle(`Learning notes for ${date}`)
    setContent('')
    setLearningDate(date)
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const selectEntry = (entry: journalApi.JournalEntry) => {
    setSelectedId(entry.id)
    setTitle(entry.title)
    setContent(entry.content)
    setLearningDate(entry.learningDate ?? '')
    setIsDirty(false)
    setSaveStatus('saved')
  }

  const markChanged = () => {
    draftVersionRef.current += 1
    setIsDirty(true)
    setSaveStatus('idle')
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

  const openCalendarDate = (date: string) => {
    const matchingEntry = (entriesQuery.data ?? []).find((entry) => entry.learningDate === date)
    if (matchingEntry) {
      void openEntry(matchingEntry)
      return
    }

    prepareEntryForDate(date)
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
    mutationFn: (input: { id: string; patch: journalApi.UpdateJournalEntryInput; version: number }) =>
      journalApi.updateJournalEntry(input.id, input.patch),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: async (entry, input) => {
      queryClient.setQueryData(['journal', 'entry', entry.id], entry)
      if (draftVersionRef.current === input.version) {
        setIsDirty(false)
        setSaveStatus('saved')
      }
      await refresh()
    },
    onError: () => setSaveStatus('error'),
  })
  const saveEntry = updateEntry.mutate
  const isUpdatePending = updateEntry.isPending

  const deleteEntry = useMutation({
    mutationFn: journalApi.deleteJournalEntry,
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: ['journal', 'entry', id] })
      clearEditor()
      await refresh()
    },
  })

  const isSaving = createEntry.isPending || isUpdatePending
  const isOpening = openingId !== null

  useEffect(() => {
    if (!selectedId || !isDirty || isOpening || !title.trim() || isUpdatePending) return

    const version = draftVersionRef.current
    const timer = window.setTimeout(() => {
      saveEntry({ id: selectedId, patch: { title, content, learningDate }, version })
    }, 2_000)

    return () => window.clearTimeout(timer)
  }, [content, isDirty, isOpening, isUpdatePending, learningDate, saveEntry, selectedId, title])

  function submitEntry(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    if (selectedId) {
      saveEntry({ id: selectedId, patch: { title, content, learningDate }, version: draftVersionRef.current })
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
            <p>Shape language-learning notes with rich text and calm, automatic saving.</p>
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

            <section className="journal-calendar" aria-label="Learning date calendar">
              <header>
                <button aria-label="Previous calendar month" type="button" onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <strong>{monthLabel(calendarMonth)}</strong>
                <button aria-label="Next calendar month" type="button" onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}>
                  <ChevronRight size={16} />
                </button>
              </header>
              <div className="journal-calendar-weekdays" aria-hidden="true">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="journal-calendar-grid">
                {calendarDates.map((day) => {
                  const count = calendarCounts.get(day.value) ?? 0
                  const isSelected = learningDate === day.value
                  return (
                    <button
                      aria-label={`${day.value}${count > 0 ? `, ${count} journal ${count === 1 ? 'entry' : 'entries'}` : ', no journal entries'}`}
                      className={[
                        'journal-calendar-day',
                        day.isCurrentMonth ? '' : 'journal-calendar-day--muted',
                        count > 0 ? 'journal-calendar-day--has-entry' : '',
                        isSelected ? 'journal-calendar-day--selected' : '',
                      ].filter(Boolean).join(' ')}
                      data-testid={`journal-calendar-day-${day.value}`}
                      key={day.value}
                      type="button"
                      onClick={() => openCalendarDate(day.value)}
                    >
                      <span>{day.date.getDate()}</span>
                      {count > 0 ? <small>{count}</small> : null}
                    </button>
                  )
                })}
              </div>
              {calendarQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load calendar dates.</p> : null}
            </section>

            <label className="journal-search">
              <Search size={17} />
              <span className="sr-only">Search journal content</span>
              <input
                aria-label="Search journal content"
                data-testid="journal-search-input"
                maxLength={100}
                placeholder="Search journal content..."
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery ? (
                <button aria-label="Clear journal search" type="button" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              ) : null}
            </label>

            {isListLoading ? <p className="flashcard-status">{isSearching ? 'Searching journal entries...' : 'Loading journal entries...'}</p> : null}
            {isListError ? <p className="flashcard-status flashcard-status--error">Could not load journal entries.</p> : null}
            {!isListLoading && !isListError && entries.length === 0 ? (
              <div className="empty-panel journal-empty">
                {isSearching ? <Search size={28} /> : <NotebookPen size={28} />}
                <h2>{isSearching ? 'No matching entries' : 'No journal entries yet'}</h2>
                <p>{isSearching ? `No content matches "${debouncedSearchQuery}".` : "Write one thought from today's language practice."}</p>
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
                  <p><HighlightedPreview entry={entry} /></p>
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
                onChange={(event) => {
                  setTitle(event.target.value)
                  markChanged()
                }}
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
                onChange={(event) => {
                  setLearningDate(event.target.value)
                  markChanged()
                }}
              />
            </label>

            <label className="journal-content-label">
              Content
              <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                <JournalRichTextEditor
                  disabled={isOpening}
                  content={content}
                  onChange={(html) => {
                    setContent(html)
                    markChanged()
                  }}
                />
              </Suspense>
            </label>

            <footer>
              <small data-testid="journal-save-status">
                {selectedId
                  ? saveStatus === 'saving'
                    ? 'Saving...'
                    : saveStatus === 'saved'
                      ? 'Saved'
                      : saveStatus === 'error'
                        ? 'Save failed'
                        : isDirty
                          ? 'Unsaved changes'
                          : 'Saved'
                  : `${content.length.toLocaleString()} / 100,000 HTML characters`}
              </small>
              <button className="primary-button" type="submit" disabled={isSaving || isOpening || !title.trim()} data-testid="save-journal-button">
                {isSaving || isOpening ? <Loader2 size={18} /> : <Save size={18} />} {selectedId ? saveStatus === 'error' ? 'Retry save' : 'Save changes' : 'Create entry'}
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
