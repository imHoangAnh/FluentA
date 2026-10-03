import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, CheckCircle2, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import * as vocabularyApi from '../api/vocabulary.api'
import { vocabularyKeys } from '../api/vocabulary.queries'
import { toast } from '@/shared/lib/toast'
import { restoreTrashEntry } from '@/features/trash'
import { SelectMenu } from '@/shared/components/ui/select-menu'

const cellClassName = 'min-h-9 w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:border-border hover:bg-card focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20'
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
  preferences: vocabularyApi.BoardPreferences
  searchTerm?: string
  preferencesBusy?: boolean
  onPreferencesChange: (preferences: vocabularyApi.BoardPreferences) => Promise<void>
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
  onResizeStart,
}: {
  id: string
  label: string
  width: number
  onResizeStart: (event: React.MouseEvent<HTMLButtonElement>, key: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      className="relative flex min-h-10 items-center border-r border-foreground/70 last:border-r-0"
      style={{
        width,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <button type="button" className="flex h-full min-w-0 flex-1 cursor-grab items-center gap-1.5 overflow-hidden px-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="size-3.5 shrink-0" aria-hidden="true" />
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

function EditableCell({ column, rowId, value, onChange, onEscape, register, disabled }: {
  column: Column; rowId: string; value: vocabularyApi.WordInput;
  onChange: (update: (value: vocabularyApi.WordInput) => vocabularyApi.WordInput) => void; onEscape: () => void;
  register: (element: HTMLElement | null) => void; disabled: boolean;
}) {
    const cellValue = column.value(value)
    const updateValue = (nextValue: string) => onChange(current => column.update(current, nextValue))
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
          buttonClassName={`${cellClassName} min-h-9 justify-between px-2 py-1.5 text-sm font-normal`}
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

type PageDraft = { newWord: vocabularyApi.WordInput; isAddingWord: boolean; editingWordId: string | null; editingWord: vocabularyApi.WordInput | null; saving: boolean }
const emptyDraft = (): PageDraft => ({ newWord: emptyWord(), isAddingWord: false, editingWordId: null, editingWord: null, saving: false })
const draftKey = (pageId: string) => ['vocabulary', 'draft', pageId] as const

export function VocabTable(props: VocabTableProps) {
  return <PageVocabTable key={props.page.id} {...props} />
}

function PageVocabTable({ page, preferences, searchTerm = '', preferencesBusy = false, onPreferencesChange }: VocabTableProps) {
  const queryClient = useQueryClient()
  // QueryClient is memory-only and is cleared by the authentication boundary.
  const { data: draft } = useQuery({ queryKey: draftKey(page.id), queryFn: () => queryClient.getQueryData<PageDraft>(draftKey(page.id)) ?? emptyDraft(), initialData: emptyDraft, enabled: false, gcTime: Infinity })
  const { newWord, isAddingWord, editingWordId, editingWord } = draft
  const setDraftField = <K extends keyof PageDraft>(key: K, value: PageDraft[K] | ((current: PageDraft[K]) => PageDraft[K])) => {
    queryClient.setQueryData<PageDraft>(draftKey(page.id), (current = emptyDraft()) => ({ ...current, [key]: typeof value === 'function' ? value(current[key]) : value }))
  }
  const setNewWord = (value: vocabularyApi.WordInput | ((current: vocabularyApi.WordInput) => vocabularyApi.WordInput)) => setDraftField('newWord', value)
  const setIsAddingWord = (value: boolean) => setDraftField('isAddingWord', value)
  const setEditingWordId = (value: string | null) => setDraftField('editingWordId', value)
  const setEditingWord = (value: vocabularyApi.WordInput | null | ((current: vocabularyApi.WordInput) => vocabularyApi.WordInput)) => setDraftField('editingWord', current => typeof value === 'function' ? value(current ?? emptyWord()) : value)
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
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase()
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

  const columns = [...baseColumns].sort((left, right) => columnOrder.indexOf(left.key) - columnOrder.indexOf(right.key))
  const gridTemplateColumns = `${columns.map((column) => `${columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]}px`).join(' ')} 80px`
  const firstKey = columns[0]?.key

  const createWord = useMutation({
    mutationFn: (input: { pageId: string; word: vocabularyApi.WordInput }) => vocabularyApi.createWord(input.pageId, input.word),
    onMutate: input => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), current => current ? { ...current, saving: true } : current),
    onSettled: (_data, _error, input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), current => current ? { ...current, saving: false } : current),
    onSuccess: (word, input) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(vocabularyKeys.words(input.pageId), (current = []) => [...current.filter(item => item.id !== word.id), word])
      queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current = emptyDraft()) => current.newWord === input.word ? { ...current, newWord: emptyWord(), isAddingWord: false } : current)
      requestAnimationFrame(() => addRowTriggerRef.current?.focus())
      toast.success('Word created successfully')
    },
  })

  const updateWord = useMutation({
    mutationFn: (input: { pageId: string; id: string; word: vocabularyApi.WordInput }) => vocabularyApi.updateWord(input.id, input.word),
    onMutate: input => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), current => current ? { ...current, saving: true } : current),
    onSettled: (_data, _error, input) => queryClient.setQueryData<PageDraft>(draftKey(input.pageId), current => current ? { ...current, saving: false } : current),
    onSuccess: (updatedWord, input) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(vocabularyKeys.words(input.pageId), (current = []) => current.map((word) => word.id === updatedWord.id ? updatedWord : word))
      queryClient.setQueryData<PageDraft>(draftKey(input.pageId), (current = emptyDraft()) => current.editingWord === input.word ? { ...current, editingWordId: null, editingWord: null } : current)
      toast.success('Word updated successfully')
    },
  })

  const deleteWord = useMutation({
    mutationFn: (target: { id: string; name: string }) => vocabularyApi.deleteWord(target.id),
    onSuccess: (entry, target) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => current.filter((word) => word.id !== target.id))
      if (editingWordId === target.id) {
        setEditingWordId(null)
        setEditingWord(null)
      }
      requestAnimationFrame(() => tableFocusRef.current?.focus())
      toast.success('Word moved to Trash.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(() => queryClient.invalidateQueries({ queryKey: wordsKey }))
              .then(() => toast.success('Word restored.'))
              .catch(() => toast.error('Could not restore the word.'))
          },
        },
      })
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
    const nextOrder = columnOrder.map(key => hidden.has(key) ? key : visibleOrder[visibleIndex++])
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
    try { await createWord.mutateAsync({ pageId: page.id, word: newWord }) } catch { /* Draft remains available for manual retry. */ }
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

    return <div className="min-h-10 whitespace-pre-wrap break-words px-2 py-1.5 text-sm leading-5">{displayValue}</div>
  }

  return (
    <div ref={tableFocusRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-card outline-none" data-testid="vocab-table-scroll">
      <div className="min-w-max">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((column) => column.key)} strategy={horizontalListSortingStrategy}>
            <div className="sticky top-0 z-10 grid border-b border-border bg-primary/10 shadow-[0_1px_0_var(--border)] backdrop-blur" style={{ gridTemplateColumns }}>
              {columns.map((column) => (
                <SortableHeader
                  key={column.key}
                  id={column.key}
                  label={column.label}
                  width={columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]}
                  onResizeStart={handleResizeStart}
                />
              ))}
              <div
                className="sticky right-0 z-20 min-h-10 border-l border-border bg-primary/10"
                data-testid="sticky-actions-header"
              />
            </div>
          </SortableContext>
        </DndContext>

        {isAddingWord ? (
          <form className="grid min-h-12 items-start border-b border-border bg-primary/5 py-1" style={{ gridTemplateColumns }} onSubmit={submitBlank}>
            {columns.map((column) => (
              <div className="min-w-0 self-start border-r border-border px-1 last:border-r-0" key={column.key}>
                <EditableCell column={column} rowId="new" value={newWord} onChange={setNewWord} onEscape={cancelAddingWord} disabled={draft.saving} register={element => { cellRefs.current[`new:${column.key}`] = element }} />
              </div>
            ))}
            <div className="sticky right-0 z-[5] flex min-h-10 items-center justify-center gap-1 border-l border-border bg-primary/10 px-1" data-testid="sticky-create-actions">
              <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" type="submit" disabled={draft.saving || createWord.isPending} data-testid="create-word-button" title="Add word" aria-label="Add word">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </button>
              <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent" type="button" disabled={draft.saving} title="Cancel adding word" aria-label="Cancel adding word" onClick={cancelAddingWord}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        ) : (
          <button
            ref={addRowTriggerRef}
            className="grid min-h-11 w-full cursor-pointer items-center border-b border-border bg-card text-left text-sm text-muted-foreground transition-colors hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-55"
            style={{ gridTemplateColumns }}
            type="button"
            onClick={beginAddingWord}
            disabled={editingWordId !== null}
            data-testid="add-vocabulary-row-trigger"
          >
            <span className="col-span-full flex items-center gap-2 px-2">
              <Plus className="size-4" aria-hidden="true" />
              Click to add a new vocabulary row...
            </span>
          </button>
        )}

        {visibleWords.map((word, index) => (
          editingWordId === word.id && editingWord ? (
            <form className="grid min-h-12 items-start border-b border-border bg-primary/5 py-1" style={{ gridTemplateColumns }} key={word.id} onSubmit={(event) => submitEditedWord(event, word.id)}>
              {columns.map((column) => (
                <div className="min-w-0 self-start border-r border-border px-1" key={column.key}>
                  <EditableCell column={column} rowId={word.id} value={editingWord} onChange={setEditingWord} onEscape={cancelEditingWord} disabled={draft.saving} register={element => { cellRefs.current[`${word.id}:${column.key}`] = element }} />
                </div>
              ))}
              <div className="sticky right-0 z-[5] flex min-h-10 items-center justify-center gap-1 border-l border-border bg-primary/10 px-1" data-testid="sticky-word-actions">
                <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" type="submit" disabled={draft.saving || updateWord.isPending || deleteWord.isPending} aria-label={`Update ${word.word}`} title="Update word">
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={draft.saving || updateWord.isPending || deleteWord.isPending} aria-label={`Delete ${word.word}`} title="Delete word" onClick={() => deleteWord.mutate({ id: word.id, name: word.word })}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              {updateWord.isError && updateWord.variables?.id === word.id ? <div className="col-span-full px-3 py-1 text-xs text-destructive" role="alert">Could not update this word. Check the fields and try again.</div> : null}
            </form>
          ) : (
            <div className={`grid min-h-12 items-start border-b border-border py-1 transition-colors hover:bg-accent/20 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`} style={{ gridTemplateColumns }} key={word.id}>
              {columns.map((column) => (
                <div className="min-w-0 self-start border-r border-border px-1" key={column.key}>
                  {renderReadOnlyCell(column, word)}
                </div>
              ))}
              <div className="sticky right-0 z-[5] flex min-h-10 items-center justify-center border-l border-border bg-card" data-testid="sticky-word-actions">
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
              </div>
            </div>
          )
        ))}

        {!wordsQuery.isLoading && normalizedSearch && visibleWords.length === 0 ? (
          <div className="border-b border-border px-4 py-8 text-center text-sm text-muted-foreground">No vocabulary matches your search.</div>
        ) : null}

        {wordsQuery.isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading words...</div> : null}
        {createWord.isError && isAddingWord ? <div className="border-b border-border px-4 py-2 text-sm text-destructive" role="alert">Could not create word. Check the fields and try again.</div> : null}
      </div>
    </div>
  )
}
