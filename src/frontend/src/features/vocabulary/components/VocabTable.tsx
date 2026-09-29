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

export function VocabTable({ page, preferences, searchTerm = '', onPreferencesChange }: VocabTableProps) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState<vocabularyApi.WordInput>(emptyWord)
  const [isAddingWord, setIsAddingWord] = useState(false)
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [editingWord, setEditingWord] = useState<vocabularyApi.WordInput | null>(null)
  const [columnOrder, setColumnOrder] = useState<string[]>(preferences.columnOrder)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS,
    ...preferences.columnWidths,
  })
  const cellRefs = useRef<Record<string, HTMLElement | null>>({})
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
    mutationFn: (input: vocabularyApi.WordInput) => vocabularyApi.createWord(page.id, input),
    onSuccess: (word) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => [...current, word])
      setNewWord(emptyWord())
      setIsAddingWord(false)
      requestAnimationFrame(() => addRowTriggerRef.current?.focus())
      toast.success('Word created successfully')
    },
  })

  const updateWord = useMutation({
    mutationFn: (input: { id: string; word: vocabularyApi.WordInput }) => vocabularyApi.updateWord(input.id, input.word),
    onSuccess: (updatedWord) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => current.map((word) => word.id === updatedWord.id ? updatedWord : word))
      setEditingWordId(null)
      setEditingWord(null)
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
    function onMouseMove(event: MouseEvent) {
      if (!resizeRef.current) return
      const nextWidth = Math.max(80, Math.min(1200, resizeRef.current.startWidth + event.clientX - resizeRef.current.startX))
      setColumnWidths((current) => ({ ...current, [resizeRef.current!.key]: nextWidth }))
    }

    function onMouseUp() {
      if (!resizeRef.current) return
      const nextPreferences = {
        ...preferences,
        columnOrder,
        columnWidths,
      }
      resizeRef.current = null
      void onPreferencesChange(nextPreferences)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [columnOrder, columnWidths, onPreferencesChange, preferences])

  function focus(rowId: string, key: string | undefined) {
    if (key) requestAnimationFrame(() => cellRefs.current[`${rowId}:${key}`]?.focus())
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentOrder = columns.map((column) => column.key)
    const nextOrder = arrayMove(currentOrder, currentOrder.indexOf(active.id as string), currentOrder.indexOf(over.id as string))
    setColumnOrder(nextOrder)
    void onPreferencesChange({
      ...preferences,
      columnOrder: nextOrder,
      columnWidths,
    })
  }

  function handleResizeStart(event: React.MouseEvent<HTMLButtonElement>, key: string) {
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[key],
    }
  }

  async function createFromBlank() {
    if (createWord.isPending) return
    await createWord.mutateAsync(newWord)
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
    setEditingWordId(null)
    setEditingWord(null)
    updateWord.reset()
  }

  function submitEditedWord(event: FormEvent, wordId: string) {
    event.preventDefault()
    if (!editingWord || editingWordId !== wordId || updateWord.isPending) return
    updateWord.mutate({ id: wordId, word: editingWord })
  }

  function renderEditableCell(
    column: Column,
    rowId: string,
    value: vocabularyApi.WordInput,
    onChange: (nextValue: vocabularyApi.WordInput) => void,
    onEscape: () => void,
  ): ReactNode {
    const cellValue = column.value(value)
    const register = (element: HTMLElement | null) => { cellRefs.current[`${rowId}:${column.key}`] = element }
    const updateValue = (nextValue: string) => onChange(column.update(value, nextValue))
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
        required={column.required}
        onChange={(event) => updateValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={column.label}
        rows={1}
      />
    )
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
                {renderEditableCell(column, 'new', newWord, setNewWord, cancelAddingWord)}
              </div>
            ))}
            <div className="sticky right-0 z-[5] flex min-h-10 items-center justify-center gap-1 border-l border-border bg-primary/10 px-1" data-testid="sticky-create-actions">
              <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" type="submit" disabled={createWord.isPending} data-testid="create-word-button" title="Add word" aria-label="Add word">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </button>
              <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent" type="button" title="Cancel adding word" aria-label="Cancel adding word" onClick={cancelAddingWord}>
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
                  {renderEditableCell(column, word.id, editingWord, (nextWord) => setEditingWord(nextWord), cancelEditingWord)}
                </div>
              ))}
              <div className="sticky right-0 z-[5] flex min-h-10 items-center justify-center gap-1 border-l border-border bg-primary/10 px-1" data-testid="sticky-word-actions">
                <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" type="submit" disabled={updateWord.isPending || deleteWord.isPending} aria-label={`Update ${word.word}`} title="Update word">
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={updateWord.isPending || deleteWord.isPending} aria-label={`Delete ${word.word}`} title="Delete word" onClick={() => deleteWord.mutate({ id: word.id, name: word.word })}>
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
