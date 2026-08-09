import { useEffect, useId, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import { type ProjectCardForm, projectPriorities } from './project-card-editor'
import type { ProjectCard } from '../api/project.api'
import { SelectMenu } from '@/shared/components/ui/select-menu'

type ProjectCardDetailPanelProps = {
  mode: 'create' | 'edit'
  editorKey: string
  form: ProjectCardForm
  pending: boolean
  onChange: (form: ProjectCardForm) => void
  onSubmit: () => void
  onDelete?: () => void
  onClose: () => void
}

export function ProjectCardDetailPanel({
  mode,
  editorKey,
  form,
  pending,
  onChange,
  onSubmit,
  onDelete,
  onClose,
}: ProjectCardDetailPanelProps) {
  const headingId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)

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
    <aside className="project-detail-panel" aria-labelledby={headingId} aria-busy={pending}>

      <form
        className="project-detail-panel__form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className="project-detail-panel__header">
          <div>
            <h2 id={headingId} className="project-detail-panel-title">Card details</h2>
          </div>
          <button type="button" aria-label="Close card details" onClick={onClose} disabled={pending}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="project-detail-panel__body">
          <label>
            <span>Title</span>
            <input
              ref={titleInputRef}
              data-testid="project-edit-title-input"
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
            <SelectMenu
              value={form.priority}
              onChange={(priority) => onChange({ ...form, priority: priority as ProjectCard['priority'] })}
              options={projectPriorities.map((priority) => ({ value: priority, label: priority }))}
              aria-label="Priority"
            />
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

        <footer className="project-detail-panel__footer">
          {mode === 'edit' && onDelete ? (
            <button type="button" className="project-danger-btn" onClick={onDelete} disabled={pending}>
              <Trash2 aria-hidden="true" />
              Delete
            </button>
          ) : null}
          <div className="project-detail-panel__actions">
            <button type="button" className="project-secondary-btn" onClick={onClose} disabled={pending}>Cancel</button>
            <button type="submit" className="project-primary-btn" disabled={!form.title.trim() || pending}>Save card</button>
          </div>
        </footer>
      </form>
    </aside>
  )
}
