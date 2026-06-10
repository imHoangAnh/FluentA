import { Columns3, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from '../../lib/api/vocabulary.api'

const optionalColumns = [
  { key: 'thesaurus', name: 'Thesaurus' },
  { key: 'collocation', name: 'Collocation' },
  { key: 'note', name: 'Note' },
]

export function ColumnSettings({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'text' | 'number'>('text')
  const configuration = useQuery({
    queryKey: ['vocab', 'columns', boardId],
    queryFn: () => vocabularyApi.getColumnConfiguration(boardId),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['vocab', 'columns', boardId] })
  const createColumn = useMutation({
    mutationFn: () => vocabularyApi.createCustomColumn(boardId, { name, type }),
    onSuccess: async () => {
      setName('')
      await refresh()
    },
  })
  const deleteColumn = useMutation({
    mutationFn: (columnId: string) => vocabularyApi.deleteCustomColumn(boardId, columnId),
    onSuccess: refresh,
  })
  const updateVisibility = useMutation({
    mutationFn: (hiddenColumnKeys: string[]) => vocabularyApi.updateColumnVisibility(boardId, hiddenColumnKeys),
    onSuccess: (value) => queryClient.setQueryData(['vocab', 'columns', boardId], value),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    createColumn.mutate()
  }

  function toggle(key: string) {
    const hidden = new Set(configuration.data?.hiddenColumnKeys ?? [])
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)
    updateVisibility.mutate([...hidden])
  }

  return (
    <div className="column-settings">
      <button className="ghost-button ghost-button--inline" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Columns3 size={17} /> Columns
      </button>
      {open ? (
        <div className="column-settings__panel">
          <h4>Board columns</h4>
          <p>Visibility is private to you. Custom columns are shared across this board.</p>
          <div className="column-settings__list">
            {optionalColumns.map((column) => (
              <label key={column.key}>
                <input
                  type="checkbox"
                  checked={!configuration.data?.hiddenColumnKeys.includes(column.key)}
                  onChange={() => toggle(column.key)}
                />
                {column.name}
              </label>
            ))}
            {configuration.data?.customColumns.map((column) => {
              const key = `custom:${column.id}`
              return (
                <div className="column-settings__custom" key={column.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!configuration.data.hiddenColumnKeys.includes(key)}
                      onChange={() => toggle(key)}
                    />
                    {column.name} <small>{column.type}</small>
                  </label>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label={`Delete custom column ${column.name}`}
                    onClick={() => {
                      if (window.confirm(`Permanently delete "${column.name}" and all of its values?`)) deleteColumn.mutate(column.id)
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
          <form className="column-settings__create" onSubmit={submit}>
            <input aria-label="Custom column name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Column name" required />
            <select aria-label="Custom column type" value={type} onChange={(event) => setType(event.target.value as 'text' | 'number')}>
              <option value="text">text</option>
              <option value="number">number</option>
            </select>
            <button className="primary-button" type="submit" disabled={createColumn.isPending}>
              <Plus size={16} /> Add column
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
