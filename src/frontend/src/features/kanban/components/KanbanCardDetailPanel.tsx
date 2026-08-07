import { useEffect, useId, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import { type KanbanCardForm, kanbanPriorities } from './kanban-card-editor'
import type { KanbanCard } from '../api/kanban.api'

type KanbanCardDetailPanelProps = {
  mode: 'create' | 'edit'
  editorKey: string
  form: KanbanCardForm
  pending: boolean
  onChange: (form: KanbanCardForm) => void
  onSubmit: () => void
  onDelete?: () => void
  onClose: () => void
}

export function KanbanCardDetailPanel({
  mode,
  editorKey,
  form,
  pending,
  onChange,
  onSubmit,
  onDelete,
  onClose,
}: KanbanCardDetailPanelProps) {
  const headingId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const heading = mode === 'create' ? 'Create card' : 'Edit card'

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [editorKey])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <aside className="kanban-detail-panel" aria-labelledby={headingId} aria-busy={pending}>

      <form
        className="kanban-detail-panel__form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className="kanban-detail-panel__header">
          <div>
            <h2 id={headingId} className="kanban-detail-panel-title">Card details</h2>
          </div>
          <button type="button" aria-label="Close card details" onClick={onClose} disabled={pending}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="kanban-detail-panel__body">
          <label>
            <span>Title</span>
            <input
              ref={titleInputRef}
              data-testid="kanban-edit-title-input"
              value={form.title}
              maxLength={240}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={form.description}
              maxLength={4000}
              placeholder="Add a description"
              onChange={(event) => onChange({ ...form, description: event.target.value })}
            />
          </label>
          <label>
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) => onChange({ ...form, priority: event.target.value as KanbanCard['priority'] })}
            >
              {kanbanPriorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            <span>Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => onChange({ ...form, deadline: event.target.value })}
            />
          </label>
        </div>

        <footer className="kanban-detail-panel__footer">
          {mode === 'edit' && onDelete ? (
            <button type="button" className="kanban-danger-btn" onClick={onDelete} disabled={pending}>
              <Trash2 aria-hidden="true" />
              Delete
            </button>
          ) : null}
          <div className="kanban-detail-panel__actions">
            <button type="button" className="kanban-secondary-btn" onClick={onClose} disabled={pending}>Cancel</button>
            <button type="submit" className="kanban-primary-btn" disabled={!form.title.trim() || pending}>Save card</button>
          </div>
        </footer>
      </form>
    </aside>
  )
}
