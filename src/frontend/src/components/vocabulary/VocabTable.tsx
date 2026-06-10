import { Plus, Trash2 } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from '../../lib/api/vocabulary.api'
import { getLanguageProfile } from '../../lib/language'
import { ColumnSettings } from './ColumnSettings'

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
  type: 'text' | 'number' | 'select'
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
  register: (element: HTMLInputElement | HTMLSelectElement | null) => void
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

  async function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      suppressBlur.current = true
      queued.current = null
      setDraft(confirmed.current)
      setError(null)
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Enter' && onEndEnter) {
      event.preventDefault()
      await commitValue(draft)
      await onEndEnter()
    }
  }

  const shared = {
    ref: register,
    'aria-label': label,
    value: draft,
    required,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(event.target.value),
    onBlur,
    onKeyDown,
  }

  return (
    <div className={`word-cell${error ? ' word-cell--error' : ''}`}>
      {type === 'select' ? (
        <select {...shared}>
          {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input {...shared} type={type} step={type === 'number' ? 'any' : undefined} />
      )}
      {saving ? <small className="word-cell__status">Saving...</small> : null}
      {error ? (
        <small className="word-cell__error">
          {error} <button type="button" onClick={() => void commitValue(draft)}>Retry</button>
        </small>
      ) : null}
    </div>
  )
}

export function VocabTable({ boardId, page, boardLanguage = 'en' }: { boardId: string; page: vocabularyApi.Page; boardLanguage?: string }) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState<vocabularyApi.WordInput>(emptyWord)
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  const languageProfile = getLanguageProfile(boardLanguage)
  const wordsKey = ['vocab', 'words', page.id]
  const wordsQuery = useQuery({ queryKey: wordsKey, queryFn: () => vocabularyApi.listWords(boardId, page.id) })
  const columnsQuery = useQuery({
    queryKey: ['vocab', 'columns', boardId],
    queryFn: () => vocabularyApi.getColumnConfiguration(boardId),
  })
  const hidden = new Set(columnsQuery.data?.hiddenColumnKeys ?? [])

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
  const columns: Column[] = [
    fixed('word', 'Word', 'word', 'text', true),
    fixed('meaningVn', 'Vietnamese meaning', 'Vietnamese meaning', 'text', true),
    fixed('meaningEn', languageProfile.secondaryMeaningLabel, languageProfile.secondaryMeaningNewLabel, 'text', true),
    fixed('class', 'Class', 'word class', 'select', true),
    fixed('example', 'Example', 'example', 'text', true),
    ...(!hidden.has('thesaurus') ? [fixed('thesaurus', 'Thesaurus', 'thesaurus')] : []),
    ...(!hidden.has('collocation') ? [fixed('collocation', 'Collocation', 'collocation')] : []),
    ...(!hidden.has('note') ? [fixed('note', 'Note', 'note')] : []),
    ...(columnsQuery.data?.customColumns
      .filter((column) => !hidden.has(`custom:${column.id}`))
      .map<Column>((column) => ({
        key: `custom:${column.id}`,
        label: column.name,
        newLabel: column.name,
        type: column.type,
        value: (word) => customValue(word, column.id),
        update: (word, value) => updateCustom(word, column.id, value),
      })) ?? []),
  ]
  const gridTemplateColumns = `${columns.map(() => 'minmax(150px, 1fr)').join(' ')} 56px`
  const firstKey = columns[0]?.key
  const lastKey = columns.at(-1)?.key
  const focus = (rowId: string, key: string | undefined) => {
    if (key) requestAnimationFrame(() => cellRefs.current[`${rowId}:${key}`]?.focus())
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
      ref: (element: HTMLInputElement | HTMLSelectElement | null) => { cellRefs.current[`new:${column.key}`] = element },
      'aria-label': `New ${column.newLabel}`,
      value: column.value(newWord),
      required: column.required,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNewWord((current) => column.update(current, event.target.value)),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (event.key === 'Escape') setNewWord(emptyWord())
        if (event.key === 'Enter' && column.key === lastKey) {
          event.preventDefault()
          void createFromBlank()
        }
      },
    }
    return column.type === 'select'
      ? <select {...shared}>{classOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      : <input {...shared} type={column.type} step={column.type === 'number' ? 'any' : undefined} placeholder={column.label} />
  }

  return (
    <section className="word-panel" aria-label={`Vocabulary words for ${page.name}`}>
      <div className="word-panel__header">
        <div><span className="preview-label">Selected page</span><h3>{page.name}</h3></div>
        <div className="word-panel__tools"><strong>{wordsQuery.data?.length ?? 0} words</strong><ColumnSettings boardId={boardId} /></div>
      </div>
      <div className="word-table-wrap">
        {wordsQuery.data?.map((word) => (
          <div className="word-row" style={{ gridTemplateColumns }} key={word.id}>
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
            <button
              className="icon-button icon-button--danger"
              type="button"
              tabIndex={-1}
              aria-label={`Delete ${word.word}`}
              onClick={() => { if (window.confirm(`Delete "${word.word}"?`)) deleteWord.mutate(word.id) }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <form className="word-row word-row--create" style={{ gridTemplateColumns }} onSubmit={submitBlank}>
          {columns.map((column) => <div className="word-cell" key={column.key}>{renderBlankCell(column)}</div>)}
          <button className="primary-button word-action" type="submit" tabIndex={-1} disabled={createWord.isPending} data-testid="create-word-button">
            <Plus size={16} /> Add
          </button>
        </form>
        {wordsQuery.isLoading ? <p className="word-status">Loading words...</p> : null}
        {createWord.isError ? <p className="word-status word-status--error">Could not create word. Fix the row and try again.</p> : null}
      </div>
    </section>
  )
}
