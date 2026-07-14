import { CalendarDays, ChevronLeft, ChevronRight, FilePlus2, Loader2, Save, Search, Trash2, X, Edit3 } from 'lucide-react'
import { type FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/shared/components/layout/AppShell'
import * as journalApi from '../api/journal.api'

const JournalRichTextEditor = lazy(() =>
  import('../components/JournalRichTextEditor').then((module) => ({ default: module.JournalRichTextEditor })),
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
    return <>{entry.title}</>
  }

  const parts: React.ReactNode[] = []
  let position = 0
  for (const range of entry.highlights) {
    if (range.start > position) parts.push(entry.title.slice(position, range.start))
    parts.push(<mark key={`${range.start}-${range.length}`}>{entry.title.slice(range.start, range.start + range.length)}</mark>)
    position = range.start + range.length
  }
  if (position < entry.title.length) parts.push(entry.title.slice(position))
  return <>{parts}</>
}

function hasHighlights(entry: journalApi.JournalEntrySummary | journalApi.JournalSearchResult): entry is journalApi.JournalSearchResult {
  return 'highlights' in entry
}

export function JournalPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(() => toDateInput(new Date()))
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => toMonthInput(new Date()))
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
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
    setEntryDate(toDateInput(new Date()))
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
    setEntryDate(date)
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const selectEntry = (entry: journalApi.JournalEntry) => {
    setSelectedId(entry.id)
    setTitle(entry.title)
    setContent(entry.content)
    setEntryDate(entry.date)
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
    const matchingEntry = (entriesQuery.data ?? []).find((entry) => entry.date === date)
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
      saveEntry({ id: selectedId, patch: { title, content, date: entryDate }, version })
    }, 2_000)

    return () => window.clearTimeout(timer)
  }, [content, entryDate, isDirty, isOpening, isUpdatePending, saveEntry, selectedId, title])

  function submitEntry(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    if (selectedId) {
      saveEntry({ id: selectedId, patch: { title, content, date: entryDate }, version: draftVersionRef.current })
      return
    }

    createEntry.mutate({ title, content, date: entryDate })
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
    <AppShell title="Journal" description="Capture learning reflections and keep them organized by date." contentClassName="max-w-none p-0">
        <div className="journal-page">
      <header className="journal-header">
        <div>
          <h2>My Journal</h2>
        </div>
        <div className="journal-header-actions">
          <label className="journal-search">
            <Search size={17} />
            <span className="sr-only">Search journal title</span>
            <input
              aria-label="Search journal title"
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
        </div>
      </header>

      <div className="journal-content">
        <div className="journal-sidebar">
          <section className="journal-calendar-card" aria-label="Journal date calendar">
            <header>
              <strong>{monthLabel(calendarMonth)}</strong>
              <div className="flex gap-1">
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
                const isSelected = entryDate === day.value
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
                <p className="text-center text-sm text-muted-foreground">
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
                    <span className="journal-entry-badge">ENTRY</span>
                    <span className="journal-entry-date">{formatDate(entry.date)}</span>
                  </div>
                  <strong>{entry.title}</strong>
                  {hasHighlights(entry) && entry.highlights.length > 0 ? <p><HighlightedPreview entry={entry} /></p> : null}
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
                  onClick={() => setDeleteConfirmationOpen(true)}
                  title="Delete entry"
                >
                  <Trash2 size={18} />
                </button>
              ) : null}
            </div>
            <div className="journal-editor-toolbar-right">
              <button className="primary-button m-0 min-h-9 w-auto px-4" type="submit" disabled={isSaving || isOpening || !title.trim()} data-testid="save-journal-button">
                {isSaving || isOpening ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {selectedId ? saveStatus === 'error' ? 'Retry' : 'Save' : 'Create'}
              </button>
            </div>
          </div>

          <div className="journal-editor-body">
            <div className="journal-editor-inner">
              <div className="journal-date-display">
                <CalendarDays size={18} />
                <input
                  data-testid="journal-date-input"
                  disabled={isOpening}
                  value={entryDate}
                  type="date"
                  onChange={(event) => {
                    setEntryDate(event.target.value)
                    markChanged()
                  }}
                  aria-label="Journal date"
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
                className="primary-button m-0 w-auto px-6"
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
            <div className="absolute bottom-[70px] left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-destructive px-4 py-2 text-destructive-foreground" role="alert">
              The journal entry could not be saved.
            </div>
          )}
          {deleteConfirmationOpen && selectedId ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="presentation">
              <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" role="alertdialog" aria-modal="true" aria-labelledby="journal-delete-title" aria-describedby="journal-delete-description">
                <h3 id="journal-delete-title" className="m-0 text-lg font-semibold">Delete journal entry?</h3>
                <p id="journal-delete-description" className="mt-2 text-sm text-muted-foreground">“{title}” will be removed from your journal. This action cannot be undone.</p>
                <div className="mt-5 flex justify-end gap-3">
                  <button className="secondary-button" type="button" disabled={deleteEntry.isPending} onClick={() => setDeleteConfirmationOpen(false)}>Cancel</button>
                  <button className="primary-button bg-destructive hover:bg-destructive/90" type="button" disabled={deleteEntry.isPending} onClick={() => deleteEntry.mutate(selectedId)}>Delete entry</button>
                </div>
              </section>
            </div>
          ) : null}
        </form>
      </div>
        </div>
    </AppShell>
  )
}
