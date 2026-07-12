import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle2, ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import * as vocabularyApi from '../../lib/api/vocabulary.api'

const cellClassName = 'min-h-9 w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:border-border hover:bg-card focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20'

const emptyWord = (): vocabularyApi.WordInput => ({
  word: '',
  meaningVn: '',
  ipaPronunciation: '',
  definition: '',
  class: 'noun',
  example: '',
  note: '',
  synonyms: '',
  antonyms: '',
})

const classOptions = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other']

type Column = {
  key: string
  label: string
  newLabel: string
  type: 'text' | 'textarea' | 'select'
  required?: boolean
  value: (word: vocabularyApi.WordInput) => string
  update: (word: vocabularyApi.WordInput, value: string) => vocabularyApi.WordInput
}

type AutosaveCellProps = {
  label: string
  value: string
  type: Column['type']
  required?: boolean
  onSave: (value: string) => Promise<void>
  onEndEnter?: () => Promise<void> | void
  register: (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => void
}

type VocabTableProps = {
  boardId: string
  page: vocabularyApi.Page
  preferences: vocabularyApi.BoardPreferences
  onPreferencesChange: (preferences: vocabularyApi.BoardPreferences) => Promise<void>
}

function AutosaveCell({ label, value, type, required, onSave, onEndEnter, register }: AutosaveCellProps) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmed = useRef(value)
  const pending = useRef(false)
  const queued = useRef<string | null>(null)
  const suppressBlur = useRef(false)

  useEffect(() => {
    if (!pending.current && !error && draft === confirmed.current) {
      confirmed.current = value
      setDraft(value)
    }
  }, [draft, error, value])

  async function commitValue(nextValue: string): Promise<void> {
    if (nextValue === confirmed.current) return
    if (pending.current) {
      queued.current = nextValue
      return
    }

    pending.current = true
    setSaving(true)
    setError(null)
    try {
      await onSave(nextValue)
      confirmed.current = nextValue
    } catch {
      setError('Save failed.')
    } finally {
      pending.current = false
      setSaving(false)
      const next = queued.current
      queued.current = null
      if (next !== null && next !== confirmed.current) {
        await commitValue(next)
      }
    }
  }

  function onBlur() {
    if (suppressBlur.current) {
      suppressBlur.current = false
      return
    }

    void commitValue(draft)
  }

  async function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      suppressBlur.current = true
      queued.current = null
      setDraft(confirmed.current)
      setError(null)
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && onEndEnter) {
      event.preventDefault()
      await commitValue(draft)
      await onEndEnter()
    }
  }

  const shared = {
    'aria-label': label,
    value: draft,
    required,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(event.target.value),
    onBlur,
    onKeyDown,
  }

  return (
    <div>
      {type === 'select' ? (
        <div className="relative">
          <select className={`${cellClassName} appearance-none pr-7`} ref={register} {...shared}>
            {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : type === 'textarea' ? (
        <textarea className={`${cellClassName} resize-none`} ref={register} {...shared} rows={2} />
      ) : (
        <input className={cellClassName} ref={register} {...shared} type="text" />
      )}
      {saving ? <small className="px-2 text-[11px] text-muted-foreground">Saving...</small> : null}
      {error ? (
        <small className="px-2 text-[11px] text-destructive">
          {error} <button className="cursor-pointer font-semibold underline underline-offset-2" type="button" onClick={() => void commitValue(draft)}>Retry</button>
        </small>
      ) : null}
    </div>
  )
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
      className="relative flex min-h-10 items-center border-r border-border last:border-r-0"
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

export function VocabTable({ boardId, page, preferences, onPreferencesChange }: VocabTableProps) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState<vocabularyApi.WordInput>(emptyWord)
  const [columnOrder, setColumnOrder] = useState<string[]>(preferences.columnOrder)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    ...vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS,
    ...preferences.columnWidths,
  })
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({})
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  const wordsKey = ['vocab', 'words', page.id]
  const wordsQuery = useQuery({ queryKey: wordsKey, queryFn: () => vocabularyApi.listWords(boardId, page.id) })
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
    fixed('meaningVn', 'Vietnamese meaning', 'Vietnamese meaning', 'textarea', true),
    fixed('ipaPronunciation', 'IPA pronunciation', 'IPA pronunciation', 'text', true),
    ...(!hidden.has('definition') ? [fixed('definition', 'Definition', 'definition', 'textarea')] : []),
    fixed('class', 'Class', 'word class', 'select', true),
    fixed('example', 'Example', 'example', 'textarea', true),
    ...(!hidden.has('note') ? [fixed('note', 'Note', 'note', 'textarea')] : []),
    ...(!hidden.has('synonyms') ? [fixed('synonyms', 'Synonyms', 'synonyms', 'textarea')] : []),
    ...(!hidden.has('antonyms') ? [fixed('antonyms', 'Antonyms', 'antonyms', 'textarea')] : []),
  ]

  const columns = [...baseColumns].sort((left, right) => columnOrder.indexOf(left.key) - columnOrder.indexOf(right.key))
  const gridTemplateColumns = `${columns.map((column) => `${columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]}px`).join(' ')} 40px`
  const firstKey = columns[0]?.key
  const lastKey = columns.at(-1)?.key

  const createWord = useMutation({
    mutationFn: (input: vocabularyApi.WordInput) => vocabularyApi.createWord(boardId, page.id, input),
    onSuccess: (word) => {
      queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => [...current, word])
      setNewWord(emptyWord())
      focus('new', firstKey)
    },
  })

  const deleteWord = useMutation({
    mutationFn: (wordId: string) => vocabularyApi.deleteWord(boardId, wordId),
    onSuccess: (_, wordId) => queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => current.filter((word) => word.id !== wordId)),
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

  async function saveCell(wordId: string, columnKey: string, value: string) {
    const updated = await vocabularyApi.updateWordCell(boardId, wordId, columnKey, value)
    const column = columns.find((item) => item.key === columnKey)
    queryClient.setQueryData<vocabularyApi.Word[]>(wordsKey, (current = []) => current.map((word) =>
      word.id === updated.id && column ? column.update(word, column.value(updated)) as vocabularyApi.Word : word,
    ))
  }

  async function createFromBlank() {
    if (createWord.isPending) return
    await createWord.mutateAsync(newWord)
  }

  function submitBlank(event: FormEvent) {
    event.preventDefault()
    void createFromBlank()
  }

  function renderBlankCell(column: Column): ReactNode {
    const shared = {
      ref: (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => { cellRefs.current[`new:${column.key}`] = element },
      'aria-label': `New ${column.newLabel}`,
      value: column.value(newWord),
      required: column.required,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setNewWord((current) => column.update(current, event.target.value)),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (event.key === 'Escape') setNewWord(emptyWord())
        if (event.key === 'Enter' && column.key === lastKey) {
          event.preventDefault()
          void createFromBlank()
        }
      },
    }

    if (column.type === 'select') {
      return (
        <div className="relative">
          <select className={`${cellClassName} appearance-none pr-7`} {...shared}>
            {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      )
    }

    if (column.type === 'textarea') {
      return <textarea className={`${cellClassName} resize-none`} {...shared} rows={1} placeholder={column.label} />
    }

    return <input className={cellClassName} {...shared} type="text" placeholder={column.label} />
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-card" data-testid="vocab-table-scroll">
      <div className="min-w-max">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((column) => column.key)} strategy={horizontalListSortingStrategy}>
            <div className="grid border-b border-border bg-muted/70" style={{ gridTemplateColumns }}>
              {columns.map((column) => (
                <SortableHeader
                  key={column.key}
                  id={column.key}
                  label={column.label}
                  width={columnWidths[column.key] ?? vocabularyApi.DEFAULT_VOCAB_COLUMN_WIDTHS[column.key]}
                  onResizeStart={handleResizeStart}
                />
              ))}
              <div />
            </div>
          </SortableContext>
        </DndContext>

        {wordsQuery.data?.map((word) => (
          <div className="grid min-h-12 items-start border-b border-border bg-card py-1 transition-colors hover:bg-accent/20" style={{ gridTemplateColumns }} key={word.id}>
            {columns.map((column) => (
              <AutosaveCell
                key={column.key}
                label={`${column.label} for ${word.word}`}
                value={column.value(word)}
                type={column.type}
                required={column.required}
                register={(element) => { cellRefs.current[`${word.id}:${column.key}`] = element }}
                onSave={(value) => saveCell(word.id, column.key, value)}
                onEndEnter={column.key === lastKey ? () => focus('new', firstKey) : undefined}
              />
            ))}
            <div className="grid h-10 place-items-center">
              <button
                className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                type="button"
                tabIndex={-1}
                aria-label={`Delete ${word.word}`}
                onClick={() => { if (window.confirm(`Delete "${word.word}"?`)) deleteWord.mutate(word.id) }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        <form className="grid min-h-12 items-start bg-secondary/35 py-1" style={{ gridTemplateColumns }} onSubmit={submitBlank}>
          {columns.map((column) => <div key={column.key}>{renderBlankCell(column)}</div>)}
          <div className="grid h-10 place-items-center">
            <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" type="submit" tabIndex={-1} disabled={createWord.isPending} data-testid="create-word-button" title="Confirm Add" aria-label="Create word">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </form>
        {wordsQuery.isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading words...</div> : null}
        {createWord.isError ? <div className="p-4 text-sm text-destructive" role="alert">Could not create word. Fix the row and try again.</div> : null}
      </div>
    </div>
  )
}
