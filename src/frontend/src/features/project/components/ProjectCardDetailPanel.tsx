import { Check, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import type {
  ProjectCard,
  ProjectCardChecklistItem,
  ProjectColumn,
  ProjectLabel,
  ProjectLabelTone,
  ProjectMilestone,
} from '../api/project.api'
import { type ProjectCardForm, projectPriorities } from './project-card-editor'

const LABEL_TONES: Array<{ value: ProjectLabelTone; label: string }> = [
  { value: 'primary', label: 'Teal' },
  { value: 'info', label: 'Blue' },
  { value: 'warning', label: 'Amber' },
  { value: 'success', label: 'Green' },
  { value: 'neutral', label: 'Slate' },
]

type ProjectCardDetailPanelProps = {
  mode: 'create' | 'edit'
  editorKey: string
  form: ProjectCardForm
  columns: ProjectColumn[]
  milestones: ProjectMilestone[]
  labels: ProjectLabel[]
  checklistItems: ProjectCardChecklistItem[]
  pending: boolean
  suspendEscape?: boolean
  onChange: (form: ProjectCardForm) => void
  onSubmit: () => void
  onDelete?: () => void
  onClose: () => void
  onCreateMilestone: (name: string) => Promise<ProjectMilestone | null>
  onCreateLabel: (name: string, tone: ProjectLabelTone) => Promise<ProjectLabel | null>
  onAddChecklistItem: (title: string) => Promise<void>
  onToggleChecklistItem: (item: ProjectCardChecklistItem) => Promise<void>
  onDeleteChecklistItem: (itemId: string) => Promise<void>
}

export function ProjectCardDetailPanel({
  mode,
  editorKey,
  form,
  columns,
  milestones,
  labels,
  checklistItems,
  pending,
  suspendEscape = false,
  onChange,
  onSubmit,
  onDelete,
  onClose,
  onCreateMilestone,
  onCreateLabel,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: ProjectCardDetailPanelProps) {
  const headingId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelTone, setNewLabelTone] = useState<ProjectLabelTone>('primary')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [newMilestoneName, setNewMilestoneName] = useState('')

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [editorKey])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !suspendEscape && !event.defaultPrevented) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, suspendEscape])

  const effectiveChecklistCount = mode === 'edit' ? checklistItems.length : form.initialChecklistTitles.length
  const completedChecklistCount = mode === 'edit' ? checklistItems.filter((item) => item.isCompleted).length : 0
  const checklistPercent = effectiveChecklistCount > 0
    ? Math.round((completedChecklistCount / effectiveChecklistCount) * 100)
    : 0

  async function submitNewChecklist(event: FormEvent) {
    event.preventDefault()
    const normalized = newChecklistTitle.trim()
    if (!normalized) return
    if (mode === 'create') {
      onChange({ ...form, initialChecklistTitles: [...form.initialChecklistTitles, normalized] })
      setNewChecklistTitle('')
      return
    }
    await onAddChecklistItem(normalized)
    setNewChecklistTitle('')
  }

  async function submitNewLabel(event: FormEvent) {
    event.preventDefault()
    const normalized = newLabelName.trim()
    if (!normalized) return
    const created = await onCreateLabel(normalized, newLabelTone)
    if (created) {
      onChange({ ...form, labelId: created.id })
      setNewLabelName('')
      setNewLabelTone('primary')
      setAddingLabel(false)
    }
  }

  async function submitNewMilestone(event: FormEvent) {
    event.preventDefault()
    const normalized = newMilestoneName.trim()
    if (!normalized) return
    const created = await onCreateMilestone(normalized)
    if (created) {
      onChange({ ...form, milestoneId: created.id })
      setNewMilestoneName('')
      setAddingMilestone(false)
    }
  }

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
            <span>{mode === 'create' ? 'New card' : 'Project card'}</span>
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

          <div className="project-detail-panel__grid">
            <label>
              <span>Column</span>
              <SelectMenu
                value={form.columnId}
                onChange={(columnId) => onChange({ ...form, columnId })}
                options={columns.map((col) => ({ value: col.id, label: col.name }))}
                aria-label="Column"
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
          </div>

          <div className="project-detail-panel__grid">
            <label>
              <span>Deadline</span>
              <div className="project-detail-panel__date-row">
                <input
                  type="date"
                  aria-label="Deadline"
                  value={form.deadline}
                  onChange={(event) => onChange({ ...form, deadline: event.target.value })}
                />
                {form.deadline ? (
                  <button
                    type="button"
                    className="project-detail-panel__clear-btn"
                    aria-label="Clear deadline"
                    onClick={() => onChange({ ...form, deadline: '' })}
                  >
                    <X aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </label>

            <div className="project-detail-panel__field-group">
              <div className="project-detail-panel__field-head">
                <span>Milestone</span>
                <button
                  type="button"
                  className="project-detail-panel__inline-link"
                  onClick={() => setAddingMilestone((current) => !current)}
                >
                  {addingMilestone ? 'Cancel' : '+ New'}
                </button>
              </div>
              <SelectMenu
                value={form.milestoneId ?? ''}
                onChange={(value) => onChange({ ...form, milestoneId: value || null })}
                options={[{ value: '', label: 'None' }, ...milestones.map((m) => ({ value: m.id, label: m.name }))]}
                aria-label="Milestone"
              />
              {addingMilestone ? (
                <div className="project-detail-panel__quick-create">
                  <input
                    type="text"
                    value={newMilestoneName}
                    maxLength={120}
                    aria-label="New milestone name in card"
                    placeholder="Milestone name..."
                    onChange={(event) => setNewMilestoneName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void submitNewMilestone(event)
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newMilestoneName.trim()}
                    onClick={(event) => void submitNewMilestone(event)}
                  >
                    Add
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="project-detail-panel__field-group">
            <div className="project-detail-panel__field-head">
              <span>Label</span>
              <button
                type="button"
                className="project-detail-panel__inline-link"
                onClick={() => setAddingLabel((current) => !current)}
              >
                {addingLabel ? 'Cancel' : '+ New'}
              </button>
            </div>
            <SelectMenu
              value={form.labelId ?? ''}
              onChange={(value) => onChange({ ...form, labelId: value || null })}
              options={[{ value: '', label: 'None' }, ...labels.map((l) => ({ value: l.id, label: l.name }))]}
              aria-label="Label"
            />
            {addingLabel ? (
              <div className="project-detail-panel__label-creator">
                <div className="project-detail-panel__quick-create">
                  <input
                    type="text"
                    value={newLabelName}
                    maxLength={32}
                    aria-label="New label name"
                    placeholder="e.g. #API or Shipped"
                    onChange={(event) => setNewLabelName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void submitNewLabel(event)
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newLabelName.trim()}
                    onClick={(event) => void submitNewLabel(event)}
                  >
                    Add
                  </button>
                </div>
                <div className="project-detail-panel__tone-row" role="radiogroup" aria-label="Label color">
                  {LABEL_TONES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={newLabelTone === option.value}
                      aria-label={option.label}
                      className={`project-tone-dot project-tone-dot--${option.value}${newLabelTone === option.value ? ' project-tone-dot--selected' : ''}`}
                      onClick={() => setNewLabelTone(option.value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <section className="project-detail-panel__checklist" aria-label="Card checklist">
            <div className="project-detail-panel__checklist-head">
              <span>CHECKLIST ({completedChecklistCount} / {effectiveChecklistCount})</span>
              <strong>{checklistPercent}%</strong>
            </div>

            {mode === 'edit' ? (
              <div className="project-detail-panel__checklist-list">
                {checklistItems.map((item) => (
                  <div key={item.id} className="project-detail-panel__checklist-row">
                    <button
                      type="button"
                      className={`project-detail-panel__check-box${item.isCompleted ? ' project-detail-panel__check-box--checked' : ''}`}
                      aria-label={item.isCompleted ? `Uncheck ${item.title}` : `Check ${item.title}`}
                      aria-pressed={item.isCompleted}
                      onClick={() => void onToggleChecklistItem(item)}
                    >
                      {item.isCompleted ? <Check aria-hidden="true" /> : null}
                    </button>
                    <span className={`project-detail-panel__check-title${item.isCompleted ? ' project-detail-panel__check-title--done' : ''}`}>
                      {item.title}
                    </span>
                    <button
                      type="button"
                      className="project-detail-panel__check-del"
                      aria-label={`Delete checklist item ${item.title}`}
                      onClick={() => void onDeleteChecklistItem(item.id)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="project-detail-panel__checklist-list">
                {form.initialChecklistTitles.map((itemTitle, index) => (
                  <div key={`${itemTitle}-${index}`} className="project-detail-panel__checklist-row">
                    <span className="project-detail-panel__check-box" aria-hidden="true" />
                    <span className="project-detail-panel__check-title">{itemTitle}</span>
                    <button
                      type="button"
                      className="project-detail-panel__check-del"
                      aria-label={`Remove ${itemTitle}`}
                      onClick={() =>
                        onChange({
                          ...form,
                          initialChecklistTitles: form.initialChecklistTitles.filter((_, idx) => idx !== index),
                        })
                      }
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="project-detail-panel__checklist-add">
              <Plus aria-hidden="true" />
              <input
                type="text"
                value={newChecklistTitle}
                maxLength={240}
                aria-label="Add checklist item"
                placeholder="Add checklist item..."
                onChange={(event) => setNewChecklistTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitNewChecklist(event)
                  }
                }}
              />
              {newChecklistTitle.trim() ? (
                <button type="button" onClick={(event) => void submitNewChecklist(event)}>
                  Add
                </button>
              ) : null}
            </div>
          </section>

          <label>
            <span>Description</span>
            <textarea
              value={form.description}
              maxLength={4000}
              placeholder="Add a description"
              onChange={(event) => onChange({ ...form, description: event.target.value })}
            />
          </label>
        </div>

        <footer className="project-detail-panel__footer">
          {mode === 'edit' && onDelete ? (
            <button type="button" className="project-danger-btn" onClick={onDelete} disabled={pending}>
              <Trash2 aria-hidden="true" />
              Delete
            </button>
          ) : <span />}
          <div className="project-detail-panel__actions">
            <button type="button" className="project-secondary-btn" onClick={onClose} disabled={pending}>Cancel</button>
            <button type="submit" className="project-primary-btn" disabled={!form.title.trim() || pending}>Save card</button>
          </div>
        </footer>
      </form>
    </aside>
  )
}
