import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as vocabularyApi from '../../lib/api/vocabulary.api'
import { getLanguageProfile } from '../../lib/language'

const emptyWord = (): vocabularyApi.WordInput => ({
  word: '',
  meaningVn: '',
  meaningEn: '',
  class: 'noun',
  example: '',
  thesaurus: '',
  collocation: '',
  note: '',
  customValues: [],
})

const classOptions = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other']

type Column = {
  key: string
  label: string
  newLabel: string
  type: 'text' | 'textarea' | 'number' | 'select'
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
      setError(null)
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
    // Only save on Enter for inputs, textareas need enter for newlines
    if (event.key === 'Enter' && type !== 'textarea' && onEndEnter) {
      event.preventDefault()
      await commitValue(draft)
      await onEndEnter()
    }
  }

  const shared = {
    ref: register as any,
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
        <div className="vw-select-wrapper">
          <select className="vw-input" {...shared}>
            {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <span className="material-symbols-outlined vw-select-icon">expand_more</span>
        </div>
      ) : type === 'textarea' ? (
        <textarea className="vw-input" {...shared} rows={2} style={{ fontStyle: label.includes('Example') ? 'italic' : 'normal' }} />
      ) : (
        <input className="vw-input" {...shared} type={type} step={type === 'number' ? 'any' : undefined} />
      )}
      {saving ? <small style={{fontSize: 11, color: '#6d7a77'}}>Saving...</small> : null}
      {error ? (
        <small style={{fontSize: 11, color: '#ba1a1a'}}>
          {error} <button type="button" onClick={() => void commitValue(draft)}>Retry</button>
        </small>
      ) : null}
    </div>
  )
}

function SortableHeader({ id, label }: { id: string, label: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    userSelect: 'none' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span className="material-symbols-outlined" style={{ fontSize: '14px', cursor: 'grab', verticalAlign: 'text-bottom' }}>drag_indicator</span>
      {label}
    </div>
  );
}

export function VocabTable({ boardId, page, boardLanguage = 'en' }: { boardId: string; page: vocabularyApi.Page; boardLanguage?: string }) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState<vocabularyApi.WordInput>(emptyWord)
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({})
  const languageProfile = getLanguageProfile(boardLanguage)
  const wordsKey = ['vocab', 'words', page.id]
  const wordsQuery = useQuery({ queryKey: wordsKey, queryFn: () => vocabularyApi.listWords(boardId, page.id) })
  const columnsQuery = useQuery({
    queryKey: ['vocab', 'columns', boardId],
    queryFn: () => vocabularyApi.getColumnConfiguration(boardId),
  })
  const hidden = new Set(columnsQuery.data?.hiddenColumnKeys ?? [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`vocab_column_order_${boardId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })

  useEffect(() => {
    localStorage.setItem(`vocab_column_order_${boardId}`, JSON.stringify(columnOrder))
  }, [columnOrder, boardId])

  const customValue = (word: vocabularyApi.WordInput, columnId: string) =>
    word.customValues?.find((value) => value.columnId === columnId)?.value ?? ''
  const updateCustom = (word: vocabularyApi.WordInput, columnId: string, value: string) => ({
    ...word,
    customValues: [...(word.customValues ?? []).filter((item) => item.columnId !== columnId), { columnId, value }],
  })
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
    fixed('meaningEn', languageProfile.secondaryMeaningLabel, languageProfile.secondaryMeaningNewLabel, 'textarea', true),
    fixed('class', 'Class', 'word class', 'select', true),
    fixed('example', 'Example', 'example', 'textarea', true),
    ...(!hidden.has('thesaurus') ? [fixed('thesaurus', 'Thesaurus', 'thesaurus')] : []),
    ...(!hidden.has('collocation') ? [fixed('collocation', 'Collocation', 'collocation')] : []),
    ...(!hidden.has('note') ? [fixed('note', 'Note', 'note')] : []),
    ...((columnsQuery.data?.customColumns ?? [])
      .filter((column) => !hidden.has(`custom:${column.id}`))
      .map<Column>((column) => ({
        key: `custom:${column.id}`,
        label: column.name,
        newLabel: column.name,
        type: column.type,
        value: (word) => customValue(word, column.id),
        update: (word, value) => updateCustom(word, column.id, value),
      }))),
  ]

  const columns = [...baseColumns].sort((a, b) => {
    const aIdx = columnOrder.indexOf(a.key)
    const bIdx = columnOrder.indexOf(b.key)
    if (aIdx === -1 && bIdx === -1) return 0
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  const gridTemplateColumns = `${columns.map((c) => c.key === 'class' ? 'minmax(100px, 0.5fr)' : 'minmax(150px, 1fr)').join(' ')} 40px`
  const firstKey = columns[0]?.key
  const lastKey = columns.at(-1)?.key
  const focus = (rowId: string, key: string | undefined) => {
    if (key) requestAnimationFrame(() => cellRefs.current[`${rowId}:${key}`]?.focus())
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder(() => {
        const currentOrder = columns.map(c => c.key)
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        return arrayMove(currentOrder, oldIndex, newIndex);
      });
    }
  }

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
    return column.type === 'select' ? (
      <div className="vw-select-wrapper">
        <select className="vw-input" {...shared}>
          {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <span className="material-symbols-outlined vw-select-icon">expand_more</span>
      </div>
    ) : column.type === 'textarea' ? (
      <textarea className="vw-input" {...shared} rows={1} placeholder={column.label} style={{ fontStyle: column.label.includes('Example') ? 'italic' : 'normal' }} />
    ) : (
      <input className="vw-input" {...shared} type={column.type} step={column.type === 'number' ? 'any' : undefined} placeholder={column.label} />
    )
  }

  return (
    <div className="vw-table-container">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map(c => c.key)} strategy={horizontalListSortingStrategy}>
          <div className="vw-table-header" style={{ gridTemplateColumns }}>
            {columns.map(column => <SortableHeader key={column.key} id={column.key} label={column.label} />)}
            <div></div>
          </div>
        </SortableContext>
      </DndContext>
      
      {wordsQuery.data?.map((word) => (
        <div className="vw-table-row" style={{ gridTemplateColumns }} key={word.id}>
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
          <div className="vw-action-cell">
            <button
              className="vw-delete-btn"
              type="button"
              tabIndex={-1}
              aria-label={`Delete ${word.word}`}
              onClick={() => { if (window.confirm(`Delete "${word.word}"?`)) deleteWord.mutate(word.id) }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
            </button>
          </div>
        </div>
      ))}
      
      <form className="vw-table-row create-row" style={{ gridTemplateColumns }} onSubmit={submitBlank}>
        {columns.map((column) => <div key={column.key}>{renderBlankCell(column)}</div>)}
        <div className="vw-action-cell">
          <button className="vw-confirm-btn" type="submit" tabIndex={-1} disabled={createWord.isPending} data-testid="create-word-button" title="Confirm Add">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
          </button>
        </div>
      </form>
      {wordsQuery.isLoading ? <div style={{padding: 16, color: '#6d7a77'}}>Loading words...</div> : null}
      {createWord.isError ? <div style={{padding: 16, color: '#ba1a1a'}}>Could not create word. Fix the row and try again.</div> : null}
    </div>
  )
}
