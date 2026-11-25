import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import '@fontsource-variable/lora/wght.css'
import { ImagePlus, Mic, Star, Trash2, Type, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uploadAsset } from '@/features/assets'
import { ConfirmDeletionDialog } from '@/shared/components/ConfirmDeletionDialog'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import type { RichTextEditorHandle } from '@/shared/components/rich-text/RichTextEditor'
import { RouteDraftGuard, useIsDataRouter, useUnsavedNavigation } from '@/shared/components/rich-text/useUnsavedNavigation'
import { Calendar } from '@/shared/components/ui/calendar'
import { toast } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import * as journalApi from '../api/journal.api'
import { journalKeys } from '../api/journal.queries'
import { JournalCompanionRail } from '../components/JournalCompanionRail'
import { JournalTimelineSidebar } from '../components/JournalTimelineSidebar'
import {
  FALLBACK_DAILY_QUOTES,
  getJournalMoodMeta,
  JOURNAL_MOODS,
  loadJournalQuotes,
  pickDailyQuote,
  toDateInput,
  toMonthInput,
} from '../components/journal-moods'
import { useVoiceDictation } from '../components/useVoiceDictation'
import '../styles/journal.css'

const JournalRichTextEditor = lazy(() =>
  import('@/shared/components/rich-text/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
)

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 32

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().toLowerCase()
}

function formatHeaderTime(createdAt: string | null): string | null {
  if (!createdAt) return null
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsed)
}

export function JournalPage() {
  const queryClient = useQueryClient()
  const todayDate = toDateInput(new Date())

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditorActive, setIsEditorActive] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(() => toDateInput(new Date()))
  const [createdAtTime, setCreatedAtTime] = useState<string | null>(null)
  const [mood, setMood] = useState<journalApi.JournalMoodId | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)

  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => toMonthInput(new Date()))
  const [entryFilter, setEntryFilter] = useState<'all' | 'starred'>('all')
  const [isFormatOpen, setIsFormatOpen] = useState(false)
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null)
  const [promptOffset, setPromptOffset] = useState(0)

  const hasInitializedTodayRef = useRef(false)
  const openRequestRef = useRef(0)
  const draftVersionRef = useRef(0)
  const sessionRef = useRef(0)
  const [editorSession, setEditorSession] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const objectUrls = useRef<string[]>([])

  const titleInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sidebarCalendarRef = useRef<HTMLDetailsElement>(null)
  const headerCalendarRef = useRef<HTMLDetailsElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const editorApiRef = useRef<RichTextEditorHandle | null>(null)

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  useEffect(() => {
    if (isAddingTag) {
      tagInputRef.current?.focus()
    }
  }, [isAddingTag])

  const navigation = useUnsavedNavigation(isDirty || uploadingImage)
  const isDataRouter = useIsDataRouter()

  const markChanged = useCallback(() => {
    draftVersionRef.current += 1
    setIsDirty(true)
    setSaveStatus('idle')
  }, [])

  const entriesQuery = useQuery({
    queryKey: journalKeys.entries,
    queryFn: journalApi.listJournalEntries,
  })

  const todaySummary = useMemo(
    () => (entriesQuery.data ?? []).find((entry) => entry.date === todayDate) ?? null,
    [entriesQuery.data, todayDate],
  )

  const isToday = entryDate === todayDate
  const isOpening = openingId !== null
  const isAwaitingTodayLoad =
    isToday &&
    selectedId === null &&
    !openFailed &&
    (entriesQuery.isLoading || entriesQuery.isError || Boolean(todaySummary))
  const canEditContent = isToday && isEditorActive && !isOpening && !openFailed && !isAwaitingTodayLoad
  const isReadOnlyEntry = !isToday && selectedId !== null && isEditorActive && !isOpening
  const isEmptyOtherDate = !isToday && selectedId === null && !isOpening

  const voice = useVoiceDictation((dictatedText) => {
    if (!canEditContent) return
    editorApiRef.current?.insertText(dictatedText)
  })

  const discardDraft = useCallback(() => {
    sessionRef.current++
    setEditorSession((value) => value + 1)
    setIsDirty(false)
    setUploadingImage(false)
    setImageError(null)
    setIsAddingTag(false)
    setTagInput('')
    setTagError(null)
    voice.stop()
  }, [voice])

  async function uploadJournalImages(files: File[]) {
    return Promise.all(files.map(async (file) => {
      const asset = await uploadAsset(file, 'journal-image')
      const url = URL.createObjectURL(file)
      objectUrls.current.push(url)
      return { id: asset.id, displayUrl: url, alt: file.name }
    }))
  }

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

  const vocabQuery = useQuery({
    queryKey: journalKeys.vocabSuggestions,
    queryFn: () => journalApi.getJournalVocabSuggestions(5),
    staleTime: 60_000,
  })

  const quotesQuery = useQuery({
    queryKey: journalKeys.dailyQuotes,
    queryFn: loadJournalQuotes,
    staleTime: Infinity,
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const prepareTodayEntry = useCallback(() => {
    discardDraft()
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setIsEditorActive(true)
    setTitle('')
    setContent('')
    setEntryDate(todayDate)
    setCreatedAtTime(null)
    setMood(null)
    setIsStarred(false)
    setTags([])
    setIsDirty(false)
    setSaveStatus('idle')
  }, [discardDraft, todayDate])

  const prepareEmptyOtherDate = useCallback((date: string) => {
    discardDraft()
    openRequestRef.current += 1
    setOpeningId(null)
    setOpenFailed(false)
    setSelectedId(null)
    setIsEditorActive(false)
    setIsFormatOpen(false)
    setTitle('')
    setContent('')
    setEntryDate(date)
    setCreatedAtTime(null)
    setMood(null)
    setIsStarred(false)
    setTags([])
    setIsDirty(false)
    setSaveStatus('idle')
  }, [discardDraft])

  const selectEntry = useCallback((entry: journalApi.JournalEntry) => {
    discardDraft()
    setSelectedId(entry.id)
    setIsEditorActive(true)
    if (entry.date !== todayDate) {
      setIsFormatOpen(false)
    }
    setTitle(entry.title)
    setContent(entry.content)
    setEntryDate(entry.date)
    setCreatedAtTime(entry.createdAt)
    setMood(entry.mood ?? null)
    setIsStarred(Boolean(entry.isStarred))
    setTags(entry.tags ?? [])
    setIsDirty(false)
    setSaveStatus('saved')
  }, [discardDraft, todayDate])

  const openEntry = useCallback(async (entry: journalApi.JournalEntrySummary) => {
    discardDraft()
    const requestId = openRequestRef.current + 1
    openRequestRef.current = requestId
    setOpeningId(entry.id)
    setOpenFailed(false)
    setSelectedId(entry.id)
    setIsEditorActive(false)
    if (entry.date !== todayDate) {
      setIsFormatOpen(false)
    }
    setTitle(entry.title)
    setContent('')
    setEntryDate(entry.date)
    setCreatedAtTime(entry.createdAt)
    setMood(entry.mood ?? null)
    setIsStarred(Boolean(entry.isStarred))
    setTags(entry.tags ?? [])
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
  }, [discardDraft, queryClient, selectEntry, todayDate])

  useEffect(() => {
    if (!entriesQuery.isSuccess || hasInitializedTodayRef.current) return
    hasInitializedTodayRef.current = true
    if (openRequestRef.current > 0 || draftVersionRef.current > 0 || !todaySummary) return

    const requestId = openRequestRef.current + 1
    openRequestRef.current = requestId

    void queryClient
      .fetchQuery({
        queryKey: journalKeys.entry(todaySummary.id),
        queryFn: () => journalApi.getJournalEntry(todaySummary.id),
      })
      .then((fullEntry) => {
        if (openRequestRef.current === requestId) {
          selectEntry(fullEntry)
        }
      })
      .catch(() => {
        if (openRequestRef.current === requestId) {
          setSelectedId(null)
          setOpenFailed(true)
        }
      })
  }, [entriesQuery.isSuccess, queryClient, selectEntry, todaySummary])

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

    if (date === todayDate) {
      prepareTodayEntry()
      return
    }

    prepareEmptyOtherDate(date)
  }

  const closeCalendarPopovers = () => {
    if (headerCalendarRef.current) headerCalendarRef.current.open = false
    if (sidebarCalendarRef.current) sidebarCalendarRef.current.open = false
  }

  const openCalendarDate = (date: string) => {
    closeCalendarPopovers()
    if (date === entryDate && (isEditorActive || selectedId || isEmptyOtherDate)) return
    navigation.request(() => {
      discardDraft()
      openCalendarDateNow(date)
    })
  }

  const isSearching = searchQuery.trim().length > 0
  const rawEntries = useMemo(
    () => (isSearching ? searchQueryResult.data ?? [] : entriesQuery.data ?? []),
    [entriesQuery.data, isSearching, searchQueryResult.data],
  )
  const isListLoading = isSearching
    ? searchQuery.trim() !== debouncedSearchQuery || searchQueryResult.isLoading
    : entriesQuery.isLoading
  const isListError = isSearching ? searchQueryResult.isError : entriesQuery.isError

  const calendarMap = useMemo(
    () => new Map((calendarQuery.data ?? []).map((day) => [day.date, day])),
    [calendarQuery.data],
  )
  const selectedDate = useMemo(() => {
    if (!entryDate) return undefined
    const [year, month, day] = entryDate.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [entryDate])
  const calendarMonthDate = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }, [calendarMonth])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: journalKeys.all })
  }

  type SaveInput = {
    id: string | null
    createPatch: journalApi.CreateJournalEntryInput
    updatePatch: journalApi.UpdateJournalEntryInput
    version: number
    session: number
  }

  const autosave = useMutation({
    mutationFn: (input: SaveInput) =>
      input.id
        ? journalApi.updateJournalEntry(input.id, input.updatePatch)
        : journalApi.createJournalEntry(input.createPatch),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: async (entry, input) => {
      queryClient.setQueryData(journalKeys.entry(entry.id), entry)
      if (sessionRef.current === input.session) {
        setSelectedId(entry.id)
        setCreatedAtTime(entry.createdAt)
        if (draftVersionRef.current === input.version) {
          setIsDirty(false)
          setSaveStatus('saved')
        } else {
          setSaveStatus('idle')
        }
      }
      await refresh()
    },
    onError: (error, input) => {
      if (sessionRef.current === input.session) {
        setSaveStatus(draftVersionRef.current === input.version ? 'error' : 'idle')
      }
      if ((error as { response?: { status: number } }).response?.status === 409) {
        void refresh()
      }
    },
  })

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, nextStarred }: { id: string; nextStarred: boolean }) =>
      journalApi.updateJournalEntry(id, { isStarred: nextStarred }),
    onSuccess: async (entry) => {
      queryClient.setQueryData(journalKeys.entry(entry.id), entry)
      if (selectedId === entry.id) {
        setIsStarred(Boolean(entry.isStarred))
      }
      await refresh()
    },
    onError: () => {
      toast.error('Could not update star.')
    },
  })

  const saveEntry = autosave.mutate
  const deleteEntry = useMutation({
    mutationFn: (id: string) => journalApi.deleteJournalEntry(id),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: journalKeys.entry(id) })
      queryClient.setQueryData<journalApi.JournalEntrySummary[]>(
        journalKeys.entries,
        (prev) => (prev ?? []).filter((item) => item.id !== id),
      )
      if (entryDate === todayDate) {
        prepareTodayEntry()
      } else {
        prepareEmptyOtherDate(entryDate)
      }
      await refresh()
      setDeleteTarget(null)
      toast.success('Journal entry deleted.')
    },
  })

  useEffect(() => {
    if (
      !canEditContent ||
      !isDirty ||
      !title.trim() ||
      autosave.isPending ||
      uploadingImage ||
      saveStatus === 'error' ||
      navigation.open
    ) {
      return
    }
    const version = draftVersionRef.current
    const session = sessionRef.current
    const timer = window.setTimeout(() => {
      saveEntry({
        id: selectedId,
        createPatch: {
          title,
          content,
          date: entryDate,
          mood,
          isStarred,
          tags,
        },
        updatePatch: {
          title,
          content,
          date: entryDate,
          mood: mood ?? '',
          isStarred,
          tags,
        },
        version,
        session,
      })
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [
    canEditContent,
    content,
    entryDate,
    isDirty,
    isStarred,
    mood,
    tags,
    autosave.isPending,
    saveEntry,
    selectedId,
    title,
    uploadingImage,
    saveStatus,
    navigation.open,
  ])

  const hasDraft = canEditContent && (isDirty || uploadingImage || saveStatus === 'saving' || saveStatus === 'error')
  const draftMatchesSearch =
    !isSearching ||
    title.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()) ||
    content.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()) ||
    tags.some((tag) => tag.includes(normalizeTag(searchQuery)))

  const visibleEntries = useMemo(() => {
    if (entryFilter === 'all') return rawEntries
    return rawEntries.filter((entry) => {
      if (entry.id === selectedId && isEditorActive) {
        return isStarred
      }
      return Boolean(entry.isStarred)
    })
  }, [entryFilter, isEditorActive, isStarred, rawEntries, selectedId])

  const showDraft =
    hasDraft &&
    draftMatchesSearch &&
    !selectedId &&
    (entryFilter === 'all' || isStarred)

  const isEmpty = visibleEntries.length === 0 && !showDraft
  const activeMoodMeta = getJournalMoodMeta(isEditorActive ? mood : null)
  const ambientColor = activeMoodMeta?.fg ?? '#0f766e'

  const dateLabel = selectedDate
    ? new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(selectedDate).toUpperCase()
    : entryDate

  const timeLabel = formatHeaderTime(createdAtTime)
  const draftPreview = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const dailyQuote = pickDailyQuote(
    quotesQuery.data ?? FALLBACK_DAILY_QUOTES,
    entryDate,
    promptOffset,
  )

  const handleToggleMood = (moodId: journalApi.JournalMoodId) => {
    if (!canEditContent) return
    setMood((current) => (current === moodId ? null : moodId))
    markChanged()
  }

  const handleToggleStar = () => {
    if (canEditContent) {
      setIsStarred((current) => !current)
      markChanged()
      return
    }
    if (isReadOnlyEntry && selectedId && !toggleStarMutation.isPending) {
      toggleStarMutation.mutate({ id: selectedId, nextStarred: !isStarred })
    }
  }

  const handleAddTag = () => {
    if (!canEditContent) return
    setTagError(null)
    const cleaned = normalizeTag(tagInput)
    if (!cleaned) {
      setIsAddingTag(false)
      setTagInput('')
      return
    }
    if (cleaned.length > MAX_TAG_LENGTH) {
      setTagError(`Tag must be at most ${MAX_TAG_LENGTH} characters.`)
      return
    }
    if (tags.includes(cleaned)) {
      setIsAddingTag(false)
      setTagInput('')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setTagError(`At most ${MAX_TAGS} tags are allowed.`)
      return
    }
    setTags((prev) => [...prev, cleaned])
    setTagInput('')
    setIsAddingTag(false)
    markChanged()
  }

  const handleRemoveTag = (target: string) => {
    if (!canEditContent) return
    setTags((prev) => prev.filter((item) => item !== target))
    markChanged()
  }

  const handleInsertPrompt = (prompt: string) => {
    if (!canEditContent) return
    editorApiRef.current?.insertQuote(prompt)
  }

  const handleInsertVocab = (word: string) => {
    if (!canEditContent) return
    editorApiRef.current?.insertText(`${word} `)
  }

  return (
    <div className="journal-page journal-figma">
      <div className="journal-content" data-testid="journal-workspace">
        <JournalTimelineSidebar
          entries={visibleEntries}
          allEntriesForStreak={entriesQuery.data ?? []}
          totalCount={(entriesQuery.data ?? []).length}
          selectedId={selectedId}
          entryDate={entryDate}
          searchQuery={searchQuery}
          debouncedSearchQuery={debouncedSearchQuery}
          entryFilter={entryFilter}
          isListLoading={isListLoading}
          isListError={isListError}
          isSearching={isSearching}
          isEmpty={isEmpty}
          showDraft={showDraft}
          draftTitle={title}
          draftPreview={draftPreview}
          draftMood={mood}
          draftStarred={isStarred}
          draftTags={tags}
          hasDraft={hasDraft}
          calendarMonthDate={calendarMonthDate}
          selectedDate={selectedDate}
          calendarDays={calendarQuery.data ?? []}
          calendarError={calendarQuery.isError}
          sidebarCalendarRef={sidebarCalendarRef}
          searchInputRef={searchInputRef}
          onSearchChange={setSearchQuery}
          onFilterChange={setEntryFilter}
          onSelectEntry={(entry) => {
            if (entry.id !== selectedId) {
              navigation.request(() => void openEntry(entry))
            }
          }}
          onFocusDraft={() => titleInputRef.current?.focus()}
          onCalendarMonthChange={setCalendarMonth}
          onSelectCalendarDate={openCalendarDate}
        />

        <form className="journal-writing-sanctuary" onSubmit={(event) => event.preventDefault()}>
          <div
            className="journal-mood-ambient-bar"
            data-testid="journal-mood-ambient-bar"
            style={{ backgroundColor: ambientColor }}
          />

          <div className="journal-editorial-spread">
            <div className="journal-hero-column">
              <div className="journal-editor-card">
                <div className="journal-editor-header" data-testid="journal-editor-header">
                  <div className="journal-entry-meta-bar">
                    <details
                      ref={headerCalendarRef}
                      className="journal-date-picker"
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') event.currentTarget.open = false
                      }}
                    >
                      <summary
                        className="journal-date-display"
                        data-date={entryDate}
                        data-testid="journal-date-display"
                        aria-label="Choose journal date"
                        onClick={() => setCalendarMonth(entryDate.slice(0, 7))}
                      >
                        <span>{dateLabel}</span>
                        {timeLabel && <span className="journal-date-time"> · {timeLabel}</span>}
                      </summary>
                      <div className="journal-calendar-popover">
                        <section className="journal-calendar-card" aria-label="Journal date calendar">
                          <Calendar
                            mode="single"
                            month={calendarMonthDate}
                            onMonthChange={(month) => setCalendarMonth(toMonthInput(month))}
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) openCalendarDate(toDateInput(date))
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
                                const dayInfo = calendarMap.get(dateStr)
                                const count = dayInfo?.count ?? 0
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
                      </div>
                    </details>

                    <div className="journal-editor-actions" data-testid="journal-editor-actions">
                      {(canEditContent || selectedId) && (
                        <button
                          type="button"
                          className={cn('journal-meta-icon-btn', isStarred && 'journal-meta-icon-btn--starred')}
                          aria-label="Star entry"
                          aria-pressed={isStarred}
                          disabled={isOpening || openFailed || toggleStarMutation.isPending}
                          onClick={handleToggleStar}
                          title={isStarred ? 'Remove star' : 'Star entry'}
                        >
                          <Star size={16} aria-hidden="true" />
                        </button>
                      )}
                      {selectedId && (
                        <button
                          type="button"
                          className="journal-meta-icon-btn journal-delete-button"
                          aria-label={`Delete journal ${title}`}
                          disabled={deleteEntry.isPending}
                          onClick={() => {
                            deleteEntry.reset()
                            setDeleteTarget({ id: selectedId, name: title })
                          }}
                          title="Delete entry"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="journal-mood-checkin" role="group" aria-label="Mood check-in">
                    <p className="journal-mood-prompt">How do you feel today?</p>
                    <div className="journal-mood-row">
                      {JOURNAL_MOODS.map((option) => {
                        const Icon = option.icon
                        const active = mood === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={cn('journal-mood-pill', active && 'journal-mood-pill--active')}
                            aria-pressed={active}
                            disabled={!canEditContent}
                            style={
                              active
                                ? {
                                  backgroundColor: option.bg,
                                  borderColor: option.fg,
                                  color: option.fg,
                                }
                                : undefined
                            }
                            onClick={() => handleToggleMood(option.id)}
                          >
                            <Icon size={14} aria-hidden="true" />
                            <span>{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="journal-paper-divider" />

                  <input
                    ref={titleInputRef}
                    aria-label="Journal title"
                    className="journal-title-input"
                    data-testid="journal-title-input"
                    disabled={!canEditContent}
                    value={title}
                    maxLength={240}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      markChanged()
                    }}
                    placeholder={isEmptyOtherDate ? 'No entry for this day' : 'Untitled memory...'}
                  />
                </div>

                {isFormatOpen && canEditContent && (
                  <div
                    className="journal-editor-toolbar-bar"
                    ref={setToolbarHost}
                    data-testid="journal-toolbar-host"
                  />
                )}

                <div className="journal-editor-body" data-testid="journal-editor-body">
                  <div className="journal-editor-inner">
                    <Suspense fallback={<div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>}>
                      <JournalRichTextEditor
                        key={`${entryDate}:${editorSession}`}
                        disabled={!canEditContent}
                        content={content}
                        editorApiRef={editorApiRef}
                        toolbarHost={isFormatOpen && canEditContent ? toolbarHost : null}
                        textStyleSelect
                        onImageFiles={uploadJournalImages}
                        onImageUploadingChange={setUploadingImage}
                        onImageUploadError={(message) => setImageError(message)}
                        onChange={(html) => {
                          setContent(html)
                          markChanged()
                        }}
                      />
                    </Suspense>
                  </div>
                </div>

                <div className="journal-paper-divider" />

                <div className="journal-tags-row" aria-label="Entry tags">
                  {tags.map((tag) => (
                    <span key={tag} className="journal-entry-tag-chip">
                      <span>#{tag}</span>
                      {canEditContent && (
                        <button
                          type="button"
                          className="journal-entry-tag-remove"
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}

                  {canEditContent && (
                    isAddingTag ? (
                      <input
                        ref={tagInputRef}
                        type="text"
                        aria-label="New tag"
                        className="journal-add-tag-input"
                        value={tagInput}
                        maxLength={33}
                        placeholder="tag name..."
                        onChange={(event) => {
                          setTagInput(event.target.value)
                          if (tagError) setTagError(null)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleAddTag()
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            setIsAddingTag(false)
                            setTagInput('')
                            setTagError(null)
                          }
                        }}
                        onBlur={handleAddTag}
                      />
                    ) : (
                      <button
                        type="button"
                        className="journal-add-tag-btn"
                        aria-label="Add tag"
                        disabled={tags.length >= MAX_TAGS}
                        onClick={() => {
                          setTagError(null)
                          setIsAddingTag(true)
                        }}
                      >
                        + Add tag
                      </button>
                    )
                  )}
                  {tagError && <span className="journal-tag-error" role="alert">{tagError}</span>}
                </div>
              </div>

              {canEditContent && (
                <div className="journal-bottom-dock-container">
                  <div className="journal-floating-dock" role="group" aria-label="Writing dock">
                    <button
                      type="button"
                      className={cn('journal-dock-btn', isFormatOpen && 'journal-dock-btn--active')}
                      aria-pressed={isFormatOpen}
                      onClick={() => setIsFormatOpen((open) => !open)}
                    >
                      <Type size={14} aria-hidden="true" />
                      <span>Format</span>
                    </button>
                    <button
                      type="button"
                      className="journal-dock-btn"
                      disabled={uploadingImage}
                      onClick={() => editorApiRef.current?.openImagePicker()}
                    >
                      <ImagePlus size={14} aria-hidden="true" />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      className={cn('journal-dock-btn', voice.isListening && 'journal-dock-btn--recording')}
                      aria-pressed={voice.isListening}
                      onClick={voice.toggle}
                    >
                      <Mic size={14} aria-hidden="true" />
                      <span>{voice.isListening ? 'Listening…' : 'Voice'}</span>
                    </button>
                  </div>
                </div>
              )}

              {(openFailed || saveStatus === 'error' || imageError || deleteEntry.isError || voice.notice) && (
                <div className="journal-editor-error" role="alert">
                  {voice.notice ??
                    imageError ??
                    (openFailed
                      ? 'Could not open journal.'
                      : 'The journal entry could not be saved. Edit to try again.')}
                </div>
              )}
            </div>

            <JournalCompanionRail
              dailyQuote={dailyQuote}
              canInsert={canEditContent}
              hasActiveEntry={canEditContent || isReadOnlyEntry}
              vocabItems={vocabQuery.data ?? []}
              vocabLoading={vocabQuery.isLoading}
              vocabError={vocabQuery.isError}
              activeTitle={title}
              activeContent={content}
              onCyclePrompt={() => setPromptOffset((offset) => offset + 1)}
              onInsertPrompt={handleInsertPrompt}
              onShuffleVocab={() => void vocabQuery.refetch()}
              onInsertVocab={handleInsertVocab}
            />
          </div>
        </form>
      </div>

      <UnsavedChangesDialog open={navigation.open} onStay={navigation.stay} onDiscard={navigation.discard} />
      {isDataRouter && (
        <RouteDraftGuard
          dirty={isDirty || uploadingImage}
          onDiscard={discardDraft}
          render={(open, stay, discard) => <UnsavedChangesDialog open={open} onStay={stay} onDiscard={discard} />}
        />
      )}
      <ConfirmDeletionDialog
        name={deleteTarget?.name ?? null}
        pending={deleteEntry.isPending}
        error={deleteEntry.isError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteEntry.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
