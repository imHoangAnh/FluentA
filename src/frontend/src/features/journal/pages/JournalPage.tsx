import { ConfirmDeletionDialog } from '@/shared/components/ConfirmDeletionDialog'
import { BookOpen, Plus, Search, Trash2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as journalApi from '../api/journal.api'
import { journalKeys } from '../api/journal.queries'
import { toast } from '@/shared/lib/toast'
import { Calendar } from '@/shared/components/ui/calendar'
import { cn } from '@/shared/lib/utils'
import { uploadAsset } from '@/features/assets'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { RouteDraftGuard, useIsDataRouter, useUnsavedNavigation } from '@/shared/components/rich-text/useUnsavedNavigation'

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

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditorActive, setIsEditorActive] = useState(false)
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
  const sessionRef = useRef(0)
  const [editorSession, setEditorSession] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const objectUrls = useRef<string[]>([])
  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), [])
  const navigation = useUnsavedNavigation(isDirty || uploadingImage)
  const isDataRouter = useIsDataRouter()
  function discardDraft() { sessionRef.current++; setEditorSession(value => value + 1); setIsDirty(false); setUploadingImage(false); setImageError(null) }
  async function uploadJournalImages(files: File[]) {
    return Promise.all(files.map(async file => {
      const asset = await uploadAsset(file, 'journal-image')
      const url = URL.createObjectURL(file)
      objectUrls.current.push(url)
      return { id: asset.id, displayUrl: url, alt: file.name }
    }))
  }

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
  const selectedDate = useMemo(() => {
    if (!entryDate) return undefined
    const [year, month, day] = entryDate.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [entryDate])
  const calendarMonthDate = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }, [calendarMonth])

  const clearEditor = () => {
    discardDraft()
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setIsEditorActive(false)
    setTitle('New Journal')
    setContent('')
    setEntryDate(toDateInput(new Date()))
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const prepareEntryForDate = (date: string) => {
    discardDraft()
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setIsEditorActive(false)
    setTitle('New Journal')
    setContent('')
    setEntryDate(date)
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const selectEntry = (entry: journalApi.JournalEntry) => {
    discardDraft()
    setSelectedId(entry.id)
    setIsEditorActive(true)
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
    discardDraft()
    const requestId = openRequestRef.current + 1
    openRequestRef.current = requestId
    setOpeningId(entry.id)
    setOpenFailed(false)
    setSelectedId(entry.id)
    setIsEditorActive(false)
    setTitle(entry.title)
    setContent('')
    setEntryDate(entry.date)
    try {
      const fullEntry = await queryClient.fetchQuery({
        queryKey: journalKeys.entry(entry.id),
        queryFn: () => journalApi.getJournalEntry(entry.id),
      })
      if (openRequestRef.current === requestId) selectEntry(fullEntry)
    } catch {
      if (openRequestRef.current === requestId) {
        setSelectedId(null)
        setOpenFailed(true)
      }
    } finally {
      if (openRequestRef.current === requestId) setOpeningId(null)
    }
  }

  const openCalendarDateNow = (date: string) => {
    const [year, month] = date.split('-')
    const dateMonth = `${year}-${month}`
    if (dateMonth !== calendarMonth) {
      setCalendarMonth(dateMonth)
    }

    const matchingEntry = (entriesQuery.data ?? []).find((entry) => entry.date === date)
    if (matchingEntry) {
      void openEntry(matchingEntry)
      return
    }

    prepareEntryForDate(date)
  }

  const openCalendarDate = (date: string) => {
    if (date === entryDate && (isEditorActive || selectedId)) return
    navigation.request(() => { discardDraft(); openCalendarDateNow(date) })
  }
  function startWriting() {
    if (entriesQuery.isLoading || entriesQuery.isError) return
    const existing = (entriesQuery.data ?? []).find(entry => entry.date === entryDate)
    if (existing) { void openEntry(existing); return }
    setIsEditorActive(true)
    setTitle('New Journal')
    markChanged()
  }
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: journalKeys.all })
  }

  type SaveInput = { id: string | null; patch: { title: string; content: string; date: string }; version: number; session: number }
  const autosave = useMutation({
    mutationFn: (input: SaveInput) => input.id
      ? journalApi.updateJournalEntry(input.id, input.patch)
      : journalApi.createJournalEntry(input.patch),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: async (entry, input) => {
      queryClient.setQueryData(journalKeys.entry(entry.id), entry)
      if (sessionRef.current === input.session) {
        setSelectedId(entry.id)
        if (draftVersionRef.current === input.version) { setIsDirty(false); setSaveStatus('saved') }
        else setSaveStatus('idle')
      }
      await refresh()
    },
    onError: (error, input) => {
      if (sessionRef.current === input.session) setSaveStatus(draftVersionRef.current === input.version ? 'error' : 'idle')
      if ((error as { response?: { status: number } }).response?.status === 409) void refresh()
    },
  })
  const saveEntry = autosave.mutate
  const deleteEntry = useMutation({
    mutationFn: (id: string) => journalApi.deleteJournalEntry(id),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: journalKeys.entry(id) })
      clearEditor()
      await refresh()
      setDeleteTarget(null)
      toast.success('Journal entry deleted.')
    },
  })

  const isOpening = openingId !== null
  useEffect(() => {
    if (!isEditorActive || !isDirty || isOpening || !title.trim() || autosave.isPending || uploadingImage || saveStatus === 'error' || navigation.open) return
    const version = draftVersionRef.current
    const session = sessionRef.current
    const timer = window.setTimeout(() => {
      saveEntry({ id: selectedId, patch: { title, content, date: entryDate }, version, session })
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [content, entryDate, isDirty, isEditorActive, isOpening, autosave.isPending, saveEntry, selectedId, title, uploadingImage, saveStatus, navigation.open])

  return (
    <div className="journal-page">
      <div className="journal-content" data-testid="journal-workspace">
        <div className="journal-sidebar">
          <section className="journal-calendar-card" aria-label="Journal date calendar">
            <Calendar
              mode="single"
              month={calendarMonthDate}
              onMonthChange={(month) => setCalendarMonth(toMonthInput(month))}
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  openCalendarDate(toDateInput(date))
                }
              }}
              className="p-0 w-full"
              classNames={{
                months: 'relative flex flex-col gap-2',
                month: 'flex flex-col gap-1',
                month_caption: 'flex justify-start items-center h-6 pr-14',
                caption_label: 'text-xs font-semibold text-foreground',
                nav: 'flex items-center gap-0.5 absolute right-0 top-0 z-20',
                button_previous: 'h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-md cursor-pointer pointer-events-auto border border-border inline-flex items-center justify-center',
                button_next: 'h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-md cursor-pointer pointer-events-auto border border-border inline-flex items-center justify-center',
                month_grid: 'w-full border-collapse space-y-0.5',
                weekdays: 'flex w-full justify-between',
                weekday: 'text-muted-foreground font-semibold text-[10px] text-center w-7 flex items-center justify-center',
                weeks: 'w-full flex flex-col gap-0.5',
                week: 'flex w-full justify-between',
                day: 'relative p-0 text-center text-xs flex items-center justify-center w-7 h-7 bg-transparent border-0 outline-none shadow-none ring-0',
              }}
              components={{
                DayButton: ({ day, className, ...buttonProps }) => {
                  const dateStr = day.isoDate
                  const count = calendarCounts.get(dateStr) ?? 0
                  const isSelected = entryDate === dateStr
                  const hasEntry = count > 0

                  return (
                    <button
                      {...buttonProps}
                      type="button"
                      aria-label={`${dateStr}${count > 0 ? `, ${count} journal ${count === 1 ? 'entry' : 'entries'}` : ', no journal entries'}`}
                      data-testid={`journal-calendar-day-${dateStr}`}
                      className={cn(
                        'journal-calendar-day rounded-full',
                        day.outside ? 'journal-calendar-day--muted' : '',
                        hasEntry ? 'journal-calendar-day--has-entry' : '',
                        isSelected ? 'journal-calendar-day--selected' : '',
                        className,
                      )}
                      onClick={(e) => {
                        buttonProps.onClick?.(e)
                        openCalendarDate(dateStr)
                      }}
                    >
                      {day.date.getDate()}
                      {count > 0 ? <small>{count}</small> : null}
                    </button>
                  )
                },
              }}
            />
            {calendarQuery.isError ? <p className="status-message status-message--error">Could not load calendar dates.</p> : null}
          </section>

          <div className="journal-sidebar-search">
            <label className="journal-search">
              <Search size={14} />
              <span className="sr-only">Search journals </span>
              <input
                aria-label="Search journals"
                data-testid="journal-search-input"
                maxLength={100}
                placeholder="Search journals..."
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery ? (
                <button aria-label="Clear journal search" type="button" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              ) : null}
            </label>
          </div>

          <section className="journal-entries-card">
            <div className="journal-entries-card-header">
              <h3>Recent journals</h3>
            </div>

            {isListLoading ? <p className="status-message">{isSearching ? 'Searching journal...' : 'Loading journal...'}</p> : null}
            {isListError ? <p className="status-message status-message--error">Could not load journal entries.</p> : null}
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
                  <button
                    className="journal-empty-create-button"
                    disabled={entriesQuery.isLoading || entriesQuery.isError}
                    type="button"
                    onClick={() => {
                      navigation.request(startWriting)
                    }}
                  >
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
                  onClick={() => { if (entry.id !== selectedId) navigation.request(() => void openEntry(entry)) }}
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

        <div className="journal-editor-card relative">
          {!isEditorActive && !selectedId && (
            <div className="journal-editor-empty-overlay" data-testid="journal-editor-empty-state">
              <button
                type="button"
                className="primary-button m-0 min-h-9 w-auto px-5 gap-2 shadow-sm"
                onClick={() => {
                  navigation.request(startWriting)
                }}
                disabled={entriesQuery.isLoading || entriesQuery.isError}
                data-testid="create-journal-button"
              >
                <Plus size={16} aria-hidden="true" />
                <span>Create</span>
              </button>
            </div>
          )}

          <form
            className={cn('flex flex-col h-full min-h-0 min-w-0', !isEditorActive && !selectedId && 'journal-editor-blurred')}
            onSubmit={event => event.preventDefault()}
          >
            <div className="journal-editor-header" data-testid="journal-editor-header">
              <div className="journal-editor-heading">
                <input
                  aria-label="Journal title"
                  className="journal-title-input"
                  data-testid="journal-title-input"
                  disabled={isOpening || (!isEditorActive && !selectedId)}
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

              <div className="journal-editor-actions" data-testid="journal-editor-actions">
                <small data-testid="journal-save-status">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed — edit to try again' : isDirty ? 'Unsaved changes' : selectedId ? 'Saved' : 'Draft'}
                </small>
                {selectedId ? (
                  <button
                    className="journal-delete-button"
                    type="button"
                    aria-label={`Delete journal ${title}`}
                    disabled={deleteEntry.isPending}
                    onClick={() => { if (selectedId) { deleteEntry.reset(); setDeleteTarget({ id: selectedId, name: title }) } }}
                    title="Delete entry"
                  >
                    <Trash2 size={18} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="journal-editor-toolbar-bar" ref={setToolbarHost} data-testid="journal-toolbar-host" />

            <div className="journal-editor-body" data-testid="journal-editor-body">
              <div className="journal-editor-inner">
                <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                  <JournalRichTextEditor
                    key={`${entryDate}:${editorSession}`}
                    disabled={isOpening || (!isEditorActive && !selectedId)}
                    content={content}
                    toolbarHost={toolbarHost}
                    onImageFiles={uploadJournalImages}
                    onImageUploadingChange={setUploadingImage}
                    onImageUploadError={message => { setImageError(message) }}
                    onChange={(html) => {
                      setContent(html)
                      markChanged()
                    }}
                  />
                </Suspense>
              </div>
            </div>

            {(openFailed || saveStatus === 'error' || imageError || deleteEntry.isError) && (
              <div className="journal-editor-error" role="alert">
                {imageError ?? (openFailed ? 'Could not open journal.' : 'The journal entry could not be saved. Edit to try again.')}
              </div>
            )}
          </form>
        </div>
      </div>
      <UnsavedChangesDialog open={navigation.open} onStay={navigation.stay} onDiscard={navigation.discard} />
      {isDataRouter && <RouteDraftGuard dirty={isDirty || uploadingImage} onDiscard={discardDraft} render={(open, stay, discard) => <UnsavedChangesDialog open={open} onStay={stay} onDiscard={discard} />} />}
      <ConfirmDeletionDialog name={deleteTarget?.name ?? null} pending={deleteEntry.isPending} error={deleteEntry.isError}
        onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deleteEntry.mutate(deleteTarget.id) }} />
    </div>
  )
}
