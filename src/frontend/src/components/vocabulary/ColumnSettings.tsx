import { type FormEvent, useState, useRef, useEffect } from 'react'
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
    <div className="vw-column-settings-container" ref={dropdownRef}>
      <button 
        className="vw-tool-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_column</span>
        Columns
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_drop_down</span>
      </button>

      {open && (
        <div className="vw-column-settings-dropdown">
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#191c1e' }}>Board columns</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#3d4947' }}>Visibility is private to you. Custom columns are shared across this board.</p>
          
          <div className="vw-column-settings-list">
            {optionalColumns.map((column) => (
              <label key={column.key} className="vw-column-settings-item">
                <input
                  type="checkbox"
                  checked={!(configuration.data?.hiddenColumnKeys ?? []).includes(column.key)}
                  onChange={() => toggle(column.key)}
                />
                {column.name}
              </label>
            ))}
            {(configuration.data?.customColumns ?? []).map((column) => {
              const key = `custom:${column.id}`
              return (
                <div className="vw-column-settings-item vw-column-settings-custom" key={column.id}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!(configuration.data?.hiddenColumnKeys ?? []).includes(key)}
                      onChange={() => toggle(key)}
                    />
                    {column.name} <span style={{ fontSize: '11px', color: '#6d7a77' }}>({column.type})</span>
                  </label>
                  <button
                    className="vw-delete-btn"
                    type="button"
                    aria-label={`Delete custom column ${column.name}`}
                    onClick={() => {
                      if (window.confirm(`Permanently delete "${column.name}" and all of its values?`)) deleteColumn.mutate(column.id)
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
              )
            })}
          </div>

          <form className="vw-column-settings-create" onSubmit={submit}>
            <input 
              className="vw-input" 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
              placeholder="New column name" 
              required 
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="vw-select-wrapper" style={{ flex: 1 }}>
                <select 
                  className="vw-input" 
                  value={type} 
                  onChange={(event) => setType(event.target.value as 'text' | 'number')}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
                <span className="material-symbols-outlined vw-select-icon">expand_more</span>
              </div>
              <button 
                className="vw-primary-btn" 
                style={{ padding: '0', width: '34px', height: '34px' }}
                type="submit" 
                disabled={createColumn.isPending}
                title="Add column"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
