import { 
  Bell, BookOpen, CalendarClock, CheckSquare, 
  Columns3, Globe, HelpCircle, Layers, LogOut, NotebookPen, Repeat2, Settings, 
  CalendarDays, ChevronLeft, ChevronRight, FilePlus2, Loader2, Save, Search, Trash2, X, Edit3, Kanban 
} from 'lucide-react'
import { type FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
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
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'

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

  const textContent = useMemo(() => {
    const div = document.createElement('div')
    div.innerHTML = content
    return div.textContent || ''
  }, [content])
  const wordCount = useMemo(() => textContent.trim() ? textContent.trim().split(/\s+/).length : 0, [textContent])
  const charCount = textContent.length

  const showEmptyState = !selectedId && !title && !content && !isOpening;

  return (
    <div className="dashboard-layout">
      {/* SideNavBar */}
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
          <Link to="/flashcards" className={location.pathname.startsWith('/flashcards') ? 'active' : ''}>
            <Layers size={20} /> Review
          </Link>
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
        </nav>

        <div className="dashboard-user-section">
          <div className="dashboard-user-card">
            <img 
              className="dashboard-user-avatar" 
              src={`https://ui-avatars.com/api/?name=${displayName}&background=0D9488&color=fff`} 
              alt="User" 
            />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings/review"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main" style={{ padding: '32px', height: '100vh', overflow: 'hidden' }}>
        <div className="journal-page" style={{ marginLeft: 0, padding: 0, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header className="journal-header">
        <div>
          <h2>My Journal</h2>
        </div>
        <div className="journal-header-actions">
          <label className="journal-search">
            <Search size={17} />
            <span className="sr-only">Search journal content</span>
            <input
              aria-label="Search journal content"
              data-testid="journal-search-input"
              maxLength={100}
              placeholder="Search journal..."
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
          <Link to="/notifications" aria-label="Notifications">
            <Bell size={20} />
          </Link>
        </div>
      </header>

      <div className="journal-content">
        <div className="journal-sidebar">
          <section className="journal-calendar-card" aria-label="Learning date calendar">
            <header>
              <strong>{monthLabel(calendarMonth)}</strong>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button aria-label="Previous calendar month" type="button" onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <button aria-label="Next calendar month" type="button" onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </header>
            <div className="journal-calendar-weekdays" aria-hidden="true">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}</span>)}
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
                    {day.date.getDate()}
                    {count > 0 ? <small>{count}</small> : null}
                  </button>
                )
              })}
            </div>
            {calendarQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load calendar dates.</p> : null}
          </section>

          <section className="journal-entries-card">
            <div className="journal-entries-card-header">
              <h3>Recent Entries</h3>
              <button type="button" aria-label="New journal entry" onClick={clearEditor}>
                New Entry
              </button>
            </div>

            {isListLoading ? <p className="flashcard-status">{isSearching ? 'Searching journal entries...' : 'Loading journal entries...'}</p> : null}
            {isListError ? <p className="flashcard-status flashcard-status--error">Could not load journal entries.</p> : null}
            {!isListLoading && !isListError && entries.length === 0 ? (
              <div className="journal-empty">
                <p style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center' }}>
                  {isSearching ? `No content matches "${debouncedSearchQuery}".` : "No entries found."}
                </p>
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
                  <div className="journal-entry-card-top">
                    <span className="journal-entry-badge">{entry.learningDate ? 'LEARNING' : 'NOTE'}</span>
                    <span className="journal-entry-date">{formatDate(entry.createdAt)}</span>
                  </div>
                  <strong>{entry.title}</strong>
                  <p><HighlightedPreview entry={entry} /></p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <form className="journal-editor-card" onSubmit={submitEntry}>
          <div className="journal-editor-toolbar">
            <div className="journal-editor-toolbar-left">
              {selectedId ? (
                <button
                  className="journal-toolbar-button"
                  type="button"
                  aria-label={`Delete journal ${title}`}
                  disabled={deleteEntry.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete "${title}"?`)) deleteEntry.mutate(selectedId)
                  }}
                  title="Delete entry"
                >
                  <Trash2 size={18} />
                </button>
              ) : null}
            </div>
            <div className="journal-editor-toolbar-right">
              <button className="primary-button" style={{ minHeight: '36px', padding: '0 16px', margin: 0, width: 'auto' }} type="submit" disabled={isSaving || isOpening || !title.trim()} data-testid="save-journal-button">
                {isSaving || isOpening ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {selectedId ? saveStatus === 'error' ? 'Retry' : 'Save' : 'Create'}
              </button>
            </div>
          </div>

          <div className="journal-editor-body">
            <div className="journal-editor-inner">
              <div className="journal-date-display">
                <CalendarDays size={18} />
                <input
                  data-testid="journal-learning-date-input"
                  disabled={isOpening}
                  value={learningDate}
                  type="date"
                  onChange={(event) => {
                    setLearningDate(event.target.value)
                    markChanged()
                  }}
                  aria-label="Learning date"
                />
              </div>

              <input
                className="journal-title-input"
                data-testid="journal-title-input"
                disabled={isOpening}
                value={title}
                maxLength={240}
                onChange={(event) => {
                  setTitle(event.target.value)
                  markChanged()
                }}
                placeholder="What did you feel today?"
              />

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
            </div>
          </div>

          <footer className="journal-editor-footer">
            <div className="journal-editor-stats">
              <span><strong>{wordCount}</strong> words</span>
              <span><strong>{charCount}</strong> characters</span>
            </div>
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
                : `${charCount.toLocaleString()} / 100,000 characters`}
            </small>
          </footer>

          {showEmptyState && (
            <div className="journal-empty-overlay" id="empty-state">
              <div className="journal-empty-icon">
                <Edit3 size={40} />
              </div>
              <h3>Your journey is waiting</h3>
              <p>Write your first thought from today's language practice to track your growth over time.</p>
              <button 
                type="button"
                className="primary-button" 
                style={{ width: 'auto', padding: '0 24px', margin: 0 }}
                onClick={() => {
                  setTitle('New Entry');
                  document.querySelector<HTMLInputElement>('.journal-title-input')?.focus();
                }}
              >
                <FilePlus2 size={18} />
                Create First Entry
              </button>
            </div>
          )}

          {(openFailed || createEntry.isError || updateEntry.isError || deleteEntry.isError) && (
            <div style={{ position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', background: 'var(--error)', color: 'white', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
              The journal entry could not be saved.
            </div>
          )}
        </form>
      </div>
        </div>
      </main>
    </div>
  )
}
