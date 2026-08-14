import { BookOpen, ChevronLeft, ChevronRight, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { type FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as journalApi from '../api/journal.api'
import { journalKeys } from '../api/journal.queries'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/shared/lib/toast'

const JournalRichTextEditor = lazy(() =>
  import('@/shared/components/rich-text/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
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
  const [title, setTitle] = useState('New Journal')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(() => toDateInput(new Date()))
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => toMonthInput(new Date()))
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null)
  const openRequestRef = useRef(0)
  const draftVersionRef = useRef(0)

  const entriesQuery = useQuery({
    queryKey: journalKeys.entries,
    queryFn: journalApi.listJournalEntries,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const searchQueryResult = useQuery({
    queryKey: journalKeys.search(debouncedSearchQuery),
    queryFn: () => journalApi.searchJournalEntries(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  const calendarQuery = useQuery({
    queryKey: journalKeys.calendar(calendarMonth),
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
    setTitle('New Journal')
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
        queryKey: journalKeys.entry(entry.id),
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
    await queryClient.invalidateQueries({ queryKey: journalKeys.all })
  }

  const createEntry = useMutation({
    mutationFn: journalApi.createJournalEntry,
    onSuccess: async (entry) => {
      queryClient.setQueryData(journalKeys.entry(entry.id), entry)
      selectEntry(entry)
      await refresh()
    },
  })

  const updateEntry = useMutation({
    mutationFn: (input: { id: string; patch: journalApi.UpdateJournalEntryInput; version: number }) =>
      journalApi.updateJournalEntry(input.id, input.patch),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: async (entry, input) => {
      queryClient.setQueryData(journalKeys.entry(entry.id), entry)
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
    onSuccess: async (entry, id) => {
      queryClient.removeQueries({ queryKey: journalKeys.entry(id) })
      clearEditor()
      await refresh()
      toast.success('Journal entry moved to Trash.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(refresh)
              .then(() => toast.success('Journal entry restored.'))
              .catch(() => toast.error('Could not restore the journal entry.'))
          },
        },
      })
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

  return (
    <div className="journal-page">
      <div className="journal-content" data-testid="journal-workspace">
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

          <div className="journal-sidebar-search">
            <label className="journal-search">
              <Search size={15} />
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
                  <X size={15} />
                </button>
              ) : null}
            </label>
          </div>

          <section className="journal-entries-card">
            <div className="journal-entries-card-header">
              <h3>Recent journals</h3>
              <button type="button" aria-label="New journal entry" onClick={clearEditor}>
                New Journal
              </button>
            </div>

            {isListLoading ? <p className="flashcard-status">{isSearching ? 'Searching journal entries...' : 'Loading journal entries...'}</p> : null}
            {isListError ? <p className="flashcard-status flashcard-status--error">Could not load journal entries.</p> : null}
            {!isListLoading && !isListError && entries.length === 0 ? (
              <div className="journal-empty-state" role="status">
                <div className="journal-empty-state-icon" aria-hidden="true">
                  <BookOpen size={32} strokeWidth={1.5} />
                </div>
                <h4>{isSearching ? 'No journals found' : 'No journals yet'}</h4>
                <p>
                  {isSearching ? `No journals match "${debouncedSearchQuery}".` : 'Start writing your first journal and keep your thoughts organized.'}
                </p>
                {!isSearching ? (
                  <button className="journal-empty-create-button" type="button" onClick={clearEditor}>
                    <Plus size={15} aria-hidden="true" />
                    <span>New Journal</span>
                  </button>
                ) : null}
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
                    <span className="journal-entry-date" data-testid="journal-entry-date">{formatDate(entry.date)}</span>
                  </div>
                  <strong>{entry.title}</strong>
                  {hasHighlights(entry) && entry.highlights.length > 0 ? <p><HighlightedPreview entry={entry} /></p> : null}
                </button>
              ))}
            </div>
          </section>
        </div>

        <form className="journal-editor-card" onSubmit={submitEntry}>
          <div className="journal-editor-header" data-testid="journal-editor-header">
            <div className="journal-editor-heading">
              <input
                aria-label="Journal title"
                className="journal-title-input"
                data-testid="journal-title-input"
                disabled={isOpening}
                value={title}
                maxLength={240}
                onChange={(event) => {
                  setTitle(event.target.value)
                  markChanged()
                }}
                placeholder="New Journal"
              />
              <p className="journal-date-display" data-date={entryDate} data-testid="journal-date-display">
                {formatDate(entryDate)}
              </p>
            </div>

            <div className="journal-editor-toolbar-host" ref={setToolbarHost} data-testid="journal-toolbar-host" />

            <div className="journal-editor-actions" data-testid="journal-editor-actions">
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
                  : isDirty ? 'Unsaved changes' : 'Draft'}
              </small>
              <button className="primary-button m-0 min-h-9 w-auto px-4" type="submit" disabled={isSaving || isOpening || !title.trim()} data-testid="save-journal-button">
                {isSaving || isOpening ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {selectedId && saveStatus === 'error' ? 'Retry' : 'Save'}
              </button>
              {selectedId ? (
                <button
                  className="journal-delete-button"
                  type="button"
                  aria-label={`Delete journal ${title}`}
                  disabled={deleteEntry.isPending}
                  onClick={() => selectedId && deleteEntry.mutate(selectedId)}
                  title="Delete entry"
                >
                  <Trash2 size={18} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="journal-editor-body" data-testid="journal-editor-body">
            <div className="journal-editor-inner">
              <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                <JournalRichTextEditor
                  disabled={isOpening}
                  content={content}
                  toolbarHost={toolbarHost}
                  onChange={(html) => {
                    setContent(html)
                    markChanged()
                  }}
                />
              </Suspense>
            </div>
          </div>

          {(openFailed || createEntry.isError || updateEntry.isError || deleteEntry.isError) && (
            <div className="journal-editor-error" role="alert">
              The journal entry could not be saved.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
