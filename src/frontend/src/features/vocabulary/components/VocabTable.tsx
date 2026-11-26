import { ConfirmDeletionDialog } from '@/shared/components/ConfirmDeletionDialog'
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Pencil, Plus, Search, Trash2, Volume2, X } from 'lucide-react'
import * as vocabularyApi from '../api/vocabulary.api'
import { vocabularyKeys, refreshLearningAfterVocabularyDeletion } from '../api/vocabulary.queries'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'
import { toast } from '@/shared/lib/toast'

const cellClassName = 'min-h-9 w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-foreground outline-none transition-colors hover:border-border hover:bg-card focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20'
const textCellClassName = `${cellClassName} block h-auto resize-none overflow-hidden whitespace-pre-wrap break-words leading-5`

const emptyWord = (): vocabularyApi.WordInput => ({
  word: '',
  meaning: '',
  ipaPronunciation: '',
  type: 'noun',
  context: '',
  example: '',
  synonyms: '',
  antonyms: '',
})

type Column = {
  key: string
  label: string
  newLabel: string
  type: 'text' | 'textarea' | 'select'
  required?: boolean
  value: (word: vocabularyApi.WordInput) => string
  update: (word: vocabularyApi.WordInput, value: string) => vocabularyApi.WordInput
}

type VocabTableProps = {
  page: vocabularyApi.Page
  boardLanguage?: string
  preferences: vocabularyApi.BoardPreferences
  searchTerm?: string
  onSearchChange?: (value: string) => void
  preferencesBusy?: boolean
  onPreferencesChange: (preferences: vocabularyApi.BoardPreferences) => Promise<void>
}

function speakWord(text: string, language: string) {
  const trimmed = text.trim()
  if (!trimmed || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = getLanguageProfile(language).speechLanguage
  utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language)
  window.speechSynthesis.speak(utterance)
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return

  element.style.height = '0px'
  const border = element.offsetHeight - element.clientHeight
  element.style.height = `${element.scrollHeight + border}px`
}

function toWordInput(word: vocabularyApi.Word): vocabularyApi.WordInput {
  return {
    word: word.word,
    meaning: word.meaning,
    ipaPronunciation: word.ipaPronunciation,
    type: word.type,
    context: word.context ?? '',
    example: word.example,
    synonyms: word.synonyms ?? '',
    antonyms: word.antonyms ?? '',
  }
}

function SortableHeader({
  id,
  label,
  width,
  isLast,
  onResizeStart,
}: {
  id: string
  label: string
  width: number
  isLast: boolean
  onResizeStart: (event: React.MouseEvent<HTMLButtonElement>, key: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      className="group/col relative flex min-h-[44px] items-center"
      style={{
        width: isLast ? '100%' : width,
        minWidth: isLast ? width : undefined,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        className="flex h-full min-w-0 flex-1 cursor-grab items-center gap-1.5 overflow-hidden px-4 py-3 text-left text-[11px] font-bold uppercase leading-[18px] tracking-[0.6px] text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5 shrink-0 opacity-40 transition-opacity group-hover/col:opacity-100" aria-hidden="true" />
        {label}
      </button>
      <button
        type="button"
        aria-label={`Resize ${label}`}
        className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize border-0 bg-transparent p-0 hover:bg-primary/20"
        onMouseDown={(event) => onResizeStart(event, id)}
      />
    </div>
  )
}

function EditableCell({
  column,
  rowId,
  value,
  onChange,
  onEscape,
  register,
  disabled,
}: {
  column: Column
  rowId: string
  value: vocabularyApi.WordInput
  onChange: (update: (value: vocabularyApi.WordInput) => vocabularyApi.WordInput) => void
  onEscape: () => void
  register: (element: HTMLElement | null) => void
  disabled: boolean
}) {
  const cellValue = column.value(value)
  const updateValue = (nextValue: string) => onChange((current) => column.update(current, nextValue))
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
    } else if (column.type === 'text' && event.key === 'Enter') {
      event.preventDefault()
    }
  }

  if (column.type === 'select') {
    return (
      <SelectMenu
        aria-label={`${column.label} for ${rowId === 'new' ? 'new word' : 'word'}`}
        value={cellValue}
        disabled={disabled}
        onChange={updateValue}
        buttonRef={register}
        buttonClassName={`${cellClassName} min-h-9 justify-between px-2 py-1.5 text-[13px] font-normal shadow-none`}
        options={vocabularyApi.WORD_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      />
    )
  }

  return (
    <textarea
      ref={(element) => {
        register(element)
        resizeTextarea(element)
      }}
      className={textCellClassName}
      aria-label={`${column.label} for ${rowId === 'new' ? 'new word' : 'word'}`}
      value={cellValue}
      disabled={disabled}
      required={column.required}
      onChange={(event) => updateValue(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={column.label}
      rows={1}
    />
  )
}

type PageDraft = {
  newWord: vocabularyApi.WordInput
  isAddingWord: boolean
  editingWordId: string | null
  editingWord: vocabularyApi.WordInput | null
  saving: boolean
}

const emptyDraft = (): PageDraft => ({
  newWord: emptyWord(),
  isAddingWord: false,
  editingWordId: null,
  editingWord: null,
  saving: false,
})

const draftKey = (pageId: string) => ['vocabulary', 'draft', pageId] as const

export function VocabTable(props: VocabTableProps) {
  return <PageVocabTable key={props.page.id} {...props} />
}

function PageVocabTable({
  page,
  boardLanguage = 'en',
  preferences,
  searchTerm = '',
  onSearchChange,
  preferencesBusy = false,
  onPreferencesChange,
}: VocabTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchTerm)
  const effectiveSearchTerm = onSearchChange ? searchTerm : internalSearchTerm
  const handleSearchChange = (nextValue: string) => {
    if (onSearchChange) onSearchChange(nextValue)
    else setInternalSearchTerm(nextValue)
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const queryClient = useQueryClient()
  // QueryClient is memory-only and is cleared by the authentication boundary.
  const { data: draft } = useQuery({
    queryKey: draftKey(page.id),
    queryFn: () => queryClient.getQueryData<PageDraft>(draftKey(page.id)) ?? emptyDraft(),
    initialData: emptyDraft,
    enabled: false,
    gcTime: Infinity,
  })
  const { newWord, isAddingWord, editingWordId, editingWord } = draft
  const setDraftField = <K extends keyof PageDraft>(key: K, value: PageDraft[K] | ((current: PageDraft[K]) => PageDraft[K])) => {
    queryClient.setQueryData<PageDraft>(draftKey(page.id), (current = emptyDraft()) => ({
      ...current,
      [key]: typeof value === 'function' ? value(current[key]) : value,
    }))
  }
  const setNewWord = (value: vocabularyApi.WordInput | ((current: vocabularyApi.WordInput) => vocabularyApi.WordInput)) => setDraftField('newWord', value)
  const setIsAddingWord = (value: boolean) => setDraftField('isAddingWord', value)
  const setEditingWordId = (value: string | null) => setDraftField('editingWordId', value)
  const setEditingWord = (value: vocabularyApi.WordInput | null | ((current: vocabularyApi.WordInput) => vocabularyApi.WordInput)) =>
    setDraftField('editingWord', (current) => (typeof value === 'function' ? value(current ?? emptyWord()) : value))

  const [savingPreferences, setSavingPreferences] = useState(false)
  const preferenceSaveRef = useRef(false)
  const confirmedPreferences = useRef(preferences)
  const [columnOrder, setColumnOrder] = useState<string[]>(preferences.columnOrder)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS,
    ...preferences.columnWidths,
  })
  const cellRefs = useRef<Record<string, HTMLElement | null>>({})
  const columnWidthsRef = useRef(columnWidths)
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)
  const tableFocusRef = useRef<HTMLDivElement>(null)
  const addRowTriggerRef = useRef<HTMLButtonElement>(null)

  const wordsKey = vocabularyKeys.words(page.id)
  const wordsQuery = useQuery({ queryKey: wordsKey, queryFn: () => vocabularyApi.listWords(page.id) })
  const normalizedSearch = effectiveSearchTerm.trim().toLocaleLowerCase()
  const visibleWords = (wordsQuery.data ?? []).filter((word) => {
    if (!normalizedSearch) return true
    return [word.word, word.meaning, word.ipaPronunciation, word.type, word.context, word.example, word.synonyms, word.antonyms]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch))
  })
  const sensors = useSensors(useSensor(PointerSensor))
  const hidden = new Set(preferences.hiddenColumns)

  const fixed = (key: keyof vocabularyApi.WordInput, label: string, newLabel: string, type: Column['type'] = 'text', required = false): Column => ({
    key: String(key),
    label,
    newLabel,
    type,
    required,
    value: (word) => String(word[key] ?? ''),
    update: (word, value) => ({ ...word, [key]: value }),
  })

  const baseColumns: Column[] = [
    fixed('word', 'Word', 'word', 'text', true),
    fixed('meaning', 'Meaning', 'meaning', 'textarea', true),
    fixed('ipaPronunciation', 'IPA', 'IPA pronunciation', 'text', true),
    ...(!hidden.has('context') ? [fixed('context', 'Context', 'context', 'textarea')] : []),
    fixed('type', 'Type', 'word type', 'select', true),
    fixed('example', 'Example', 'example', 'textarea', true),
    ...(!hidden.has('synonyms') ? [fixed('synonyms', 'Synonyms', 'synonyms', 'textarea')] : []),
    ...(!hidden.has('antonyms') ? [fixed('antonyms', 'Antonyms', 'antonyms', 'textarea')] : []),
  ]

  const indexInOrder = (key: string) => {
    const index = columnOrder.indexOf(key)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const columns = [...baseColumns].sort((left, right) => indexInOrder(left.key) - indexInOrder(right.key))
  const actionColWidth = 88
  const gridTemplateColumns = columns.length > 0
    ? `${columns.map((column, index) => {
      const width = columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]
      return index === columns.length - 1 ? `minmax(${width}px, 1fr)` : `${width}px`
    }).join(' ')} ${actionColWidth}px`
    : `${actionColWidth}px`
  const firstKey = columns[0]?.key

  const createWord = useMutation({
    mutationFn: (input: { pageId: string; word: vocabularyApi.WordInput }) => vocabularyApi.createWord(input.pageId, input.word),
    onMutate: (input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current) => (current ? { ...current, saving: true } : current)),
    onSettled: (_data, _error, input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current) => (current ? { ...current, saving: false } : current)),
    onSuccess: (word, input) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(vocabularyKeys.words(input.pageId), (current = []) => [...current.filter((item) => item.id !== word.id), word])
      queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current = emptyDraft()) => (current.newWord === input.word ? { ...current, newWord: emptyWord(), isAddingWord: false } : current))
      requestAnimationFrame(() => addRowTriggerRef.current?.focus())
      toast.success('Word created successfully')
    },
  })

  const updateWord = useMutation({
    mutationFn: (input: { pageId: string; id: string; word: vocabularyApi.WordInput }) => vocabularyApi.updateWord(input.id, input.word),
    onMutate: (input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current) => (current ? { ...current, saving: true } : current)),
    onSettled: (_data, _error, input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current) => (current ? { ...current, saving: false } : current)),
    onSuccess: (updatedWord, input) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(vocabularyKeys.words(input.pageId), (current = []) => current.map((word) => (word.id === updatedWord.id ? updatedWord : word)))
      queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current = emptyDraft()) => (current.editingWord === input.word ? { ...current, editingWordId: null, editingWord: null } : current))
      toast.success('Word updated successfully')
    },
  })

  const deleteWord = useMutation({
    mutationFn: (target: { id: string; name: string }) => vocabularyApi.deleteWord(target.id),
    onSuccess: (_, target) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => current.filter((word) => word.id !== target.id))
      if (editingWordId === target.id) {
        setEditingWordId(null)
        setEditingWord(null)
      }
      requestAnimationFrame(() => tableFocusRef.current?.focus())
      setDeleteTarget(null)
      refreshLearningAfterVocabularyDeletion(queryClient)
      toast.success('Word deleted.')
    },
  })

  useEffect(() => {
    confirmedPreferences.current = preferences
    if (!preferenceSaveRef.current) {
      setColumnOrder(preferences.columnOrder)
      setColumnWidths({ ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS, ...preferences.columnWidths })
      columnWidthsRef.current = { ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS, ...preferences.columnWidths }
    }
  }, [preferences])

  async function savePreferences(next: vocabularyApi.BoardPreferences) {
    if (preferenceSaveRef.current || preferencesBusy) return
    preferenceSaveRef.current = true
    setSavingPreferences(true)
    try {
      await onPreferencesChange(next)
      confirmedPreferences.current = next
    } catch {
      setColumnOrder(confirmedPreferences.current.columnOrder)
      setColumnWidths({ ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS, ...confirmedPreferences.current.columnWidths })
      columnWidthsRef.current = { ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS, ...confirmedPreferences.current.columnWidths }
      toast.error('Could not save column settings. Your last saved settings have been restored.')
    } finally {
      preferenceSaveRef.current = false
      setSavingPreferences(false)
    }
  }

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!resizeRef.current) return
      const nextWidth = Math.max(80, Math.min(1200, resizeRef.current.startWidth + event.clientX - resizeRef.current.startX))
      columnWidthsRef.current = { ...columnWidthsRef.current, [resizeRef.current.key]: nextWidth }
      setColumnWidths(columnWidthsRef.current)
    }

    function onMouseUp() {
      if (!resizeRef.current) return
      const nextPreferences = {
        ...preferences,
        columnOrder,
        columnWidths: columnWidthsRef.current,
      }
      resizeRef.current = null
      void savePreferences(nextPreferences)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  })

  function focus(rowId: string, key: string | undefined) {
    if (key) requestAnimationFrame(() => cellRefs.current[`${rowId}:${key}`]?.focus())
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || preferenceSaveRef.current || preferencesBusy) return

    const currentOrder = columns.map((column) => column.key)
    const from = currentOrder.indexOf(active.id as string)
    const to = currentOrder.indexOf(over.id as string)
    if (from < 0 || to < 0) return
    const visibleOrder = arrayMove(currentOrder, from, to)
    let visibleIndex = 0
    const nextOrder = columnOrder.map((key) => (hidden.has(key) ? key : visibleOrder[visibleIndex++]))
    setColumnOrder(nextOrder)
    void savePreferences({
      ...preferences,
      columnOrder: nextOrder,
      columnWidths,
    })
  }

  function handleResizeStart(event: React.MouseEvent<HTMLButtonElement>, key: string) {
    if (savingPreferences || preferencesBusy) return
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[key],
    }
  }

  async function createFromBlank() {
    if (createWord.isPending || queryClient.getQueryData<PageDraft>(draftKey(page.id))?.saving) return
    try {
      await createWord.mutateAsync({ pageId: page.id, word: newWord })
    } catch {
      /* Draft remains available for manual retry. */
    }
  }

  function submitBlank(event: FormEvent) {
    event.preventDefault()
    void createFromBlank()
  }

  function beginAddingWord() {
    createWord.reset()
    updateWord.reset()
    setEditingWordId(null)
    setEditingWord(null)
    setNewWord(emptyWord())
    setIsAddingWord(true)
    focus('new', firstKey)
  }

  function cancelAddingWord() {
    if (draft.saving) return
    setNewWord(emptyWord())
    setIsAddingWord(false)
    requestAnimationFrame(() => addRowTriggerRef.current?.focus())
  }

  function beginEditingWord(word: vocabularyApi.Word) {
    createWord.reset()
    updateWord.reset()
    setIsAddingWord(false)
    setEditingWordId(word.id)
    setEditingWord(toWordInput(word))
    focus(word.id, firstKey)
  }

  function cancelEditingWord() {
    if (draft.saving) return
    setEditingWordId(null)
    setEditingWord(null)
    updateWord.reset()
  }

  function submitEditedWord(event: FormEvent, wordId: string) {
    event.preventDefault()
    if (!editingWord || editingWordId !== wordId || updateWord.isPending || queryClient.getQueryData<PageDraft>(draftKey(page.id))?.saving) return
    updateWord.mutate({ pageId: page.id, id: wordId, word: editingWord })
  }

  function renderReadOnlyCell(column: Column, word: vocabularyApi.Word): ReactNode {
    const value = column.value(word)
    const displayValue = column.key === 'type'
      ? vocabularyApi.WORD_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
      : value

    if (column.key === 'word') {
      return (
        <div className="flex items-center gap-[6px] px-4 py-3">
          <span className="whitespace-pre-wrap break-words text-[13px] font-bold leading-[18px] text-foreground">{displayValue}</span>
          <button
            type="button"
            aria-label={`Pronounce ${word.word}`}
            title="Pronounce word"
            onClick={() => speakWord(word.word, boardLanguage)}
            className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-primary/80 transition-colors hover:bg-secondary hover:text-primary"
          >
            <Volume2 className="size-[13px]" aria-hidden="true" />
          </button>
        </div>
      )
    }

    if (column.key === 'ipaPronunciation') {
      return (
        <div className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-[12px] font-medium leading-[18px] text-secondary-foreground">
          {displayValue}
        </div>
      )
    }

    if (column.key === 'type') {
      return (
        <div className="px-4 py-3">
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-[10px] py-[4px] text-[11px] font-bold leading-[14px] text-[#3d4f4b]">
            {displayValue}
          </span>
        </div>
      )
    }

    if (column.key === 'meaning') {
      return (
        <div className="whitespace-pre-wrap break-words px-4 py-3 text-[13px] font-normal leading-[18px] text-foreground">
          {displayValue}
        </div>
      )
    }

    return (
      <div className="whitespace-pre-wrap break-words px-4 py-3 text-[13px] font-normal leading-[18px] text-muted-foreground">
        {displayValue}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[18px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3" data-testid="vocabulary-toolbar">
        <div className="relative w-full sm:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[14px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search vocabulary"
            className="h-[38px] rounded-[8px] border-input bg-card pl-[34px] pr-8 text-[13px] shadow-none"
            placeholder="Search words, IPA, or meaning..."
            value={effectiveSearchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') handleSearchChange('')
            }}
          />
          {effectiveSearchTerm ? (
            <button
              type="button"
              aria-label="Clear vocabulary search"
              className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => handleSearchChange('')}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Button
          ref={addRowTriggerRef}
          type="button"
          data-testid="add-vocabulary-row-trigger"
          disabled={editingWordId !== null || isAddingWord}
          onClick={beginAddingWord}
          className="h-[38px] shrink-0 rounded-[8px] bg-primary px-[16px] py-[9px] text-[14px] font-semibold leading-[20px] text-primary-foreground shadow-none hover:bg-[#0d5e58]"
        >
          <Plus className="size-4" aria-hidden="true" /> Add Word
        </Button>
      </div>

      <div
        ref={tableFocusRef}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-auto rounded-[12px] border border-border bg-card outline-none"
        data-testid="vocab-table-scroll"
      >
        <div className="min-w-full w-max">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((column) => column.key)} strategy={horizontalListSortingStrategy}>
              <div className="sticky top-0 z-10 grid min-h-[44px] items-center border-b border-border bg-muted" style={{ gridTemplateColumns }}>
                {columns.map((column, index) => (
                  <SortableHeader
                    key={column.key}
                    id={column.key}
                    label={column.label}
                    width={columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]}
                    isLast={index === columns.length - 1}
                    onResizeStart={handleResizeStart}
                  />
                ))}
                <div
                  className="sticky right-0 z-20 flex h-full min-h-[44px] items-center justify-center border-l border-border/60 bg-muted px-2 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground"
                  data-testid="sticky-actions-header"
                >
                  Actions
                </div>
              </div>
            </SortableContext>
          </DndContext>

          {isAddingWord ? (
            <form className="grid min-h-[52px] items-start border-b border-border bg-secondary/35 py-1.5" style={{ gridTemplateColumns }} onSubmit={submitBlank}>
              {columns.map((column) => (
                <div className="min-w-0 self-start px-2" key={column.key}>
                  <EditableCell
                    column={column}
                    rowId="new"
                    value={newWord}
                    onChange={setNewWord}
                    onEscape={cancelAddingWord}
                    disabled={draft.saving}
                    register={(element) => { cellRefs.current[`new:${column.key}`] = element }}
                  />
                </div>
              ))}
              <div className="sticky right-0 z-[5] flex h-full min-h-[40px] items-center justify-center gap-1 border-l border-border/60 bg-[#eef7f5] px-2" data-testid="sticky-create-actions">
                <button
                  className="grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-primary text-primary-foreground transition-colors hover:bg-[#0d5e58] disabled:cursor-not-allowed disabled:opacity-45"
                  type="submit"
                  disabled={draft.saving || createWord.isPending}
                  data-testid="create-word-button"
                  title="Add word"
                  aria-label="Add word"
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button
                  className="grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                  disabled={draft.saving}
                  title="Cancel adding word"
                  aria-label="Cancel adding word"
                  onClick={cancelAddingWord}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              {createWord.isError ? (
                <div className="col-span-full px-4 py-1.5 text-xs text-destructive" role="alert">
                  Could not create word. Check the fields and try again.
                </div>
              ) : null}
            </form>
          ) : null}

          {wordsQuery.isLoading && !wordsQuery.data ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground" role="status" data-testid="vocabulary-loading-state">
              Loading vocabulary...
            </div>
          ) : wordsQuery.isError && !wordsQuery.data ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center" role="alert">
              <p className="m-0 text-sm font-semibold text-foreground">Could not load this page&apos;s vocabulary</p>
              <p className="m-0 text-xs text-muted-foreground">Check your connection and try again.</p>
              <Button className="mt-2" size="sm" type="button" onClick={() => { void wordsQuery.refetch() }}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {visibleWords.map((word) => (
                editingWordId === word.id && editingWord ? (
                  <form
                    className="grid min-h-[52px] items-start border-b border-border bg-primary/5 py-1.5 last:border-b-0"
                    style={{ gridTemplateColumns }}
                    key={word.id}
                    onSubmit={(event) => submitEditedWord(event, word.id)}
                  >
                    {columns.map((column) => (
                      <div className="min-w-0 self-start px-2" key={column.key}>
                        <EditableCell
                          column={column}
                          rowId={word.id}
                          value={editingWord}
                          onChange={setEditingWord}
                          onEscape={cancelEditingWord}
                          disabled={draft.saving}
                          register={(element) => { cellRefs.current[`${word.id}:${column.key}`] = element }}
                        />
                      </div>
                    ))}
                    <div className="sticky right-0 z-[5] flex h-full min-h-[40px] items-center justify-center gap-1 border-l border-border/60 bg-[#f2f7f6] px-2" data-testid="sticky-word-actions">
                      <button
                        className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-[#0d5e58] disabled:cursor-not-allowed disabled:opacity-45"
                        type="submit"
                        disabled={draft.saving || updateWord.isPending || deleteWord.isPending}
                        aria-label={`Update ${word.word}`}
                        title="Update word"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                        type="button"
                        disabled={draft.saving || updateWord.isPending}
                        aria-label={`Cancel editing ${word.word}`}
                        title="Cancel editing"
                        onClick={cancelEditingWord}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    {updateWord.isError && updateWord.variables?.id === word.id ? (
                      <div className="col-span-full px-4 py-1.5 text-xs text-destructive" role="alert">
                        Could not update this word. Check the fields and try again.
                      </div>
                    ) : null}
                  </form>
                ) : (
                  <div
                    className="grid min-h-[52px] items-center border-b border-border bg-card transition-colors last:border-b-0 hover:bg-muted/35"
                    style={{ gridTemplateColumns }}
                    key={word.id}
                  >
                    {columns.map((column) => (
                      <div className="min-w-0" key={column.key}>
                        {renderReadOnlyCell(column, word)}
                      </div>
                    ))}
                    <div className="sticky right-0 z-[5] flex h-full min-h-[52px] items-center justify-center gap-1 border-l border-border/60 bg-card px-2" data-testid="sticky-word-actions">
                      <button
                        className="grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                        type="button"
                        aria-label={`Edit ${word.word}`}
                        title="Edit word"
                        disabled={editingWordId !== null || isAddingWord}
                        onClick={() => beginEditingWord(word)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        className="grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-45"
                        type="button"
                        aria-label={`Delete ${word.word}`}
                        title="Delete word"
                        disabled={editingWordId !== null || isAddingWord || deleteWord.isPending}
                        onClick={() => {
                          deleteWord.reset()
                          setDeleteTarget({ id: word.id, name: word.word })
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )
              ))}

              {normalizedSearch && visibleWords.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No vocabulary matches your search.</div>
              ) : null}

              {!normalizedSearch && visibleWords.length === 0 && !isAddingWord ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No words on this page yet. Click + Add Word to get started.
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ConfirmDeletionDialog
        name={deleteTarget?.name ?? null}
        pending={deleteWord.isPending}
        error={deleteWord.isError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteWord.mutate(deleteTarget) }}
      />
    </div>
  )
}
