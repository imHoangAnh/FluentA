import { useEffect, useRef, useState } from 'react'
import type { BoardPreferences } from '../../lib/api/vocabulary.api'

const optionalColumns = [
  { key: 'definition', name: 'Definition' },
  { key: 'note', name: 'Note' },
  { key: 'synonyms', name: 'Synonyms' },
  { key: 'antonyms', name: 'Antonyms' },
] as const

type ColumnSettingsProps = {
  preferences: BoardPreferences
  onSave: (preferences: BoardPreferences) => Promise<void> | void
}

export function ColumnSettings({ preferences, onSave }: ColumnSettingsProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(key: string) {
    const hidden = new Set(preferences.hiddenColumns)
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)

    void onSave({
      ...preferences,
      hiddenColumns: [...hidden],
    })
  }

  return (
    <div className="vw-column-settings-container" ref={dropdownRef}>
      <button
        className="vw-tool-btn"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_column</span>
        Columns
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_drop_down</span>
      </button>

      {open ? (
        <div className="vw-column-settings-dropdown">
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#191c1e' }}>Board columns</h4>

          <div className="vw-column-settings-list">
            {optionalColumns.map((column) => (
              <label key={column.key} className="vw-column-settings-item">
                <input
                  type="checkbox"
                  checked={!preferences.hiddenColumns.includes(column.key)}
                  onChange={() => toggle(column.key)}
                />
                {column.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
