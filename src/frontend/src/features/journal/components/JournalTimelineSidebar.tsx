import { Calendar as CalendarIcon, Flame, Search, Star, X } from 'lucide-react'
import { Calendar } from '@/shared/components/ui/calendar'
import { cn } from '@/shared/lib/utils'
import type { JournalCalendarDay, JournalEntrySummary, JournalMoodId, JournalSearchResult } from '../api/journal.api'
import { buildLastSevenDays, computeJournalStreak, getJournalMoodMeta, toDateInput, toMonthInput } from './journal-moods'

type JournalTimelineSidebarProps = {
  entries: ReadonlyArray<JournalEntrySummary | JournalSearchResult>
  allEntriesForStreak: ReadonlyArray<JournalEntrySummary>
  totalCount: number
  selectedId: string | null
  entryDate: string
  searchQuery: string
  debouncedSearchQuery: string
  entryFilter: 'all' | 'starred'
  isListLoading: boolean
  isListError: boolean
  isSearching: boolean
  isEmpty: boolean
  showDraft: boolean
  draftTitle: string
  draftPreview: string
  draftMood: JournalMoodId | null
  draftStarred: boolean
  draftTags: ReadonlyArray<string>
  hasDraft: boolean
  calendarMonthDate: Date
  selectedDate: Date | undefined
  calendarDays: ReadonlyArray<JournalCalendarDay>
  calendarError: boolean
  sidebarCalendarRef: React.RefObject<HTMLDetailsElement | null>
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSearchChange: (value: string) => void
  onFilterChange: (value: 'all' | 'starred') => void
  onSelectEntry: (entry: JournalEntrySummary | JournalSearchResult) => void
  onFocusDraft: () => void
  onCalendarMonthChange: (month: string) => void
  onSelectCalendarDate: (date: string) => void
}

function formatEntryCardTimestamp(dateStr: string, createdAt: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dateObj = year && month && day ? new Date(year, month - 1, day) : new Date(dateStr)
  const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj)
  const parsedTime = new Date(createdAt)
  if (Number.isNaN(parsedTime.getTime())) {
    return datePart
  }
  const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsedTime)
  return `${datePart} · ${timePart}`
}

function HighlightedPreview({ entry }: { entry: JournalEntrySummary | JournalSearchResult }) {
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

export function JournalTimelineSidebar(props: JournalTimelineSidebarProps) {
  const {
    entries,
    allEntriesForStreak,
    totalCount,
    selectedId,
    entryDate,
    searchQuery,
    debouncedSearchQuery,
    entryFilter,
    isListLoading,
    isListError,
    isSearching,
    isEmpty,
    showDraft,
    draftTitle,
    draftPreview,
    draftMood,
    draftStarred,
    draftTags,
    hasDraft,
    calendarMonthDate,
    selectedDate,
    calendarDays,
    calendarError,
    sidebarCalendarRef,
    searchInputRef,
    onSearchChange,
    onFilterChange,
    onSelectEntry,
    onFocusDraft,
    onCalendarMonthChange,
    onSelectCalendarDate,
  } = props

  const streak = computeJournalStreak(allEntriesForStreak)
  const sevenDays = buildLastSevenDays(allEntriesForStreak, entryDate)
  const calendarMap = new Map(calendarDays.map((day) => [day.date, day]))
  const draftMoodMeta = getJournalMoodMeta(draftMood)

  return (
    <aside className="journal-sidebar" aria-label="Journal timeline">
      <div className="journal-sidebar-controls">
        <section className="journal-streak-card" aria-label="Weekly writing streak">
          <div className="journal-streak-header">
            <div className="journal-streak-title">
              <Flame size={15} className="journal-streak-flame" aria-hidden="true" />
              <span>{streak}-day streak</span>
            </div>
            <details
              ref={sidebarCalendarRef}
              className="journal-sidebar-calendar-trigger"
              onKeyDown={(event) => {
                if (event.key === 'Escape') event.currentTarget.open = false
              }}
            >
              <summary className="journal-calendar-button" aria-label="Open journal calendar">
                <CalendarIcon size={13} aria-hidden="true" />
                <span>Calendar</span>
              </summary>
              <div className="journal-calendar-popover journal-calendar-popover--sidebar">
                <section className="journal-calendar-card" aria-label="Journal sidebar calendar">
                  <Calendar
                    mode="single"
                    month={calendarMonthDate}
                    onMonthChange={(month) => onCalendarMonthChange(toMonthInput(month))}
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) onSelectCalendarDate(toDateInput(date))
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
                        const info = calendarMap.get(dateStr)
                        const count = info?.count ?? 0
                        const moodMeta = getJournalMoodMeta(info?.mood)
                        const isSelected = entryDate === dateStr
                        return (
                          <button
                            {...buttonProps}
                            type="button"
                            aria-label={`${dateStr}${count > 0 ? `, ${count} journal ${count === 1 ? 'entry' : 'entries'}` : ', no journal entries'}`}
                            data-testid={`journal-sidebar-calendar-day-${dateStr}`}
                            className={cn(
                              'journal-calendar-day rounded-full',
                              day.outside ? 'journal-calendar-day--muted' : '',
                              count > 0 ? 'journal-calendar-day--has-entry' : '',
                              isSelected ? 'journal-calendar-day--selected' : '',
                              className,
                            )}
                            onClick={(e) => {
                              buttonProps.onClick?.(e)
                              onSelectCalendarDate(dateStr)
                            }}
                          >
                            {day.date.getDate()}
                            {count > 0 ? (
                              <small style={moodMeta ? { backgroundColor: moodMeta.dot } : undefined}>{count}</small>
                            ) : null}
                          </button>
                        )
                      },
                    }}
                  />
                  {calendarError ? <p className="status-message status-message--error">Could not load calendar dates.</p> : null}
                </section>
              </div>
            </details>
          </div>
          <div className="journal-streak-week" role="group" aria-label="Last 7 days">
            {sevenDays.map((day) => {
              const moodMeta = getJournalMoodMeta(day.mood)
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => onSelectCalendarDate(day.dateStr)}
                  aria-label={`Jump to ${day.dateStr}${day.hasEntry ? ', has entry' : ''}`}
                  className={cn(
                    'journal-streak-day',
                    day.isSelected && 'journal-streak-day--selected',
                  )}
                >
                  <span>{day.letter}</span>
                  <i
                    aria-hidden="true"
                    className={cn(
                      'journal-streak-dot',
                      day.hasEntry && 'journal-streak-dot--filled',
                    )}
                    style={
                      day.hasEntry
                        ? { backgroundColor: moodMeta?.dot ?? '#0f766e' }
                        : undefined
                    }
                  />
                </button>
              )
            })}
          </div>
        </section>

        <label className="journal-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search journals</span>
          <input
            ref={searchInputRef}
            aria-label="Search journals"
            data-testid="journal-search-input"
            maxLength={100}
            placeholder="Search memories, #tags..."
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery ? (
            <button
              aria-label="Clear journal search"
              className="journal-search-clear"
              type="button"
              onClick={() => onSearchChange('')}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="journal-search-shortcut" aria-hidden="true">/</kbd>
          )}
        </label>

        <div className="journal-entry-filters" role="group" aria-label="Filter journal entries">
          <button
            type="button"
            className="journal-filter-pill"
            aria-pressed={entryFilter === 'all'}
            onClick={() => onFilterChange('all')}
          >
            All {totalCount}
          </button>
          <button
            type="button"
            className="journal-filter-pill"
            aria-pressed={entryFilter === 'starred'}
            onClick={() => onFilterChange('starred')}
          >
            Starred
          </button>
        </div>
      </div>

      <section className="journal-entries-card" aria-label="Journal entries">
        {isListLoading && <p className="status-message">{isSearching ? 'Searching journal...' : 'Loading journal...'}</p>}
        {isListError && <p className="status-message status-message--error">Could not load journal entries.</p>}
        {!isListLoading && !isListError && isEmpty && (
          <div className="journal-empty-state" role="status">
            <h4>
              {isSearching
                ? 'No journals found'
                : entryFilter === 'starred'
                  ? 'No starred memories'
                  : 'Your story starts here'}
            </h4>
            <p>
              {isSearching
                ? `No journals match "${debouncedSearchQuery}".`
                : entryFilter === 'starred'
                  ? 'Star your favorite entries to revisit them quickly here.'
                  : 'Your saved entries will appear here. Start with a sentence about today.'}
            </p>
          </div>
        )}

        <div className="journal-entry-list">
          {showDraft && (
            <button
              type="button"
              className="journal-entry-card journal-entry-card--active"
              aria-label={`Open current draft ${draftTitle}`}
              onClick={onFocusDraft}
            >
              <div className="journal-entry-card-top">
                <span className="journal-entry-date" data-testid="journal-entry-date">
                  {formatEntryCardTimestamp(entryDate, new Date().toISOString())} · Draft
                </span>
                {draftMoodMeta && (
                  <span
                    className="journal-entry-mood-badge"
                    style={{ backgroundColor: draftMoodMeta.bg, color: draftMoodMeta.fg }}
                  >
                    {draftMoodMeta.label}
                  </span>
                )}
              </div>
              <strong className="journal-entry-card-title">{draftTitle || 'Untitled journal'}</strong>
              {draftPreview && <p className="journal-entry-card-preview">{draftPreview}</p>}
              {(draftTags.length > 0 || draftStarred) && (
                <div className="journal-entry-card-bottom">
                  <div className="journal-entry-card-tags">
                    {draftTags.slice(0, 3).map((tag) => (
                      <span key={tag} className="journal-card-tag">#{tag}</span>
                    ))}
                  </div>
                  {draftStarred && <Star size={13} className="journal-card-star" aria-label="Starred" />}
                </div>
              )}
            </button>
          )}

          {entries.map((entry) => {
            const isActive = selectedId === entry.id
            const activeMood = isActive && hasDraft ? draftMood : entry.mood
            const moodMeta = getJournalMoodMeta(activeMood)
            const activeStarred = isActive && hasDraft ? draftStarred : Boolean(entry.isStarred)
            const activeTags = isActive && hasDraft ? draftTags : (entry.tags ?? [])
            const activePreview = isActive && hasDraft ? draftPreview : (entry.preview ?? '')

            return (
              <button
                key={entry.id}
                type="button"
                className={cn('journal-entry-card', isActive && 'journal-entry-card--active')}
                onClick={() => onSelectEntry(entry)}
                aria-label={`Open journal ${entry.title}`}
              >
                <div className="journal-entry-card-top">
                  <span className="journal-entry-date" data-testid="journal-entry-date">
                    {formatEntryCardTimestamp(entry.date, entry.createdAt)}
                    {isActive && hasDraft ? ' · Draft' : ''}
                  </span>
                  {moodMeta && (
                    <span
                      className="journal-entry-mood-badge"
                      style={{ backgroundColor: moodMeta.bg, color: moodMeta.fg }}
                    >
                      {moodMeta.label}
                    </span>
                  )}
                </div>
                <strong className="journal-entry-card-title">
                  {isActive && hasDraft
                    ? (draftTitle || 'Untitled journal')
                    : <HighlightedPreview entry={entry} />}
                </strong>
                {activePreview && <p className="journal-entry-card-preview">{activePreview}</p>}
                {(activeTags.length > 0 || activeStarred) && (
                  <div className="journal-entry-card-bottom">
                    <div className="journal-entry-card-tags">
                      {activeTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="journal-card-tag">#{tag}</span>
                      ))}
                    </div>
                    {activeStarred && <Star size={13} className="journal-card-star" aria-label="Starred" />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
