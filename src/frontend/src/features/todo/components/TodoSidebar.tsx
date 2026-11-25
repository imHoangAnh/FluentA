import { CalendarDays, Plus, Sun, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import type { TodoPriority, TodoPriorityTone, TodoTag } from '../api/todo.api'

const PRIORITY_TONES: Array<{ value: TodoPriorityTone; label: string }> = [
  { value: 'warning', label: 'Amber' },
  { value: 'primary', label: 'Teal' },
  { value: 'destructive', label: 'Red' },
  { value: 'neutral', label: 'Slate' },
]

type TodoSidebarProps = {
  view: 'my-day' | 'week'
  myDayCount: number
  weekCount: number
  tags: TodoTag[]
  priorities: TodoPriority[]
  selectedTagId: string | null
  selectedPriorityId: string | null
  onViewChange: (view: 'my-day' | 'week') => void
  onSelectTag: (tagId: string | null) => void
  onSelectPriority: (priorityId: string | null) => void
  onCreateTag: (name: string) => Promise<TodoTag | null>
  onDeleteTag: (tagId: string) => void
  onCreatePriority: (name: string, tone: TodoPriorityTone) => Promise<TodoPriority | null>
  onDeletePriority: (priorityId: string) => void
}

export function TodoSidebar({
  view,
  myDayCount,
  weekCount,
  tags,
  priorities,
  selectedTagId,
  selectedPriorityId,
  onViewChange,
  onSelectTag,
  onSelectPriority,
  onCreateTag,
  onDeleteTag,
  onCreatePriority,
  onDeletePriority,
}: TodoSidebarProps) {
  const [addingTag, setAddingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const [addingPriority, setAddingPriority] = useState(false)
  const [priorityName, setPriorityName] = useState('')
  const [priorityTone, setPriorityTone] = useState<TodoPriorityTone>('warning')

  async function submitTag(event: FormEvent) {
    event.preventDefault()
    const normalized = tagName.trim().replace(/^#+/, '')
    if (!normalized) return
    const created = await onCreateTag(normalized)
    if (created) {
      setTagName('')
      setAddingTag(false)
    }
  }

  async function submitPriority(event: FormEvent) {
    event.preventDefault()
    const normalized = priorityName.trim()
    if (!normalized) return
    const created = await onCreatePriority(normalized, priorityTone)
    if (created) {
      setPriorityName('')
      setPriorityTone('warning')
      setAddingPriority(false)
    }
  }

  return (
    <aside className="todo-sidebar" aria-label="Todo navigation and filters">
      <nav className="todo-sidebar__views" aria-label="Todo views">
        <button
          type="button"
          className={`todo-sidebar__item${view === 'my-day' ? ' todo-sidebar__item--active' : ''}`}
          aria-current={view === 'my-day' ? 'page' : undefined}
          onClick={() => onViewChange('my-day')}
        >
          <span className="todo-sidebar__item-left">
            <Sun aria-hidden="true" />
            <span>My Day</span>
          </span>
          <span className="todo-sidebar__count">{myDayCount}</span>
        </button>

        <button
          type="button"
          className={`todo-sidebar__item${view === 'week' ? ' todo-sidebar__item--active' : ''}`}
          aria-current={view === 'week' ? 'page' : undefined}
          onClick={() => onViewChange('week')}
        >
          <span className="todo-sidebar__item-left">
            <CalendarDays aria-hidden="true" />
            <span>My Week</span>
          </span>
          <span className="todo-sidebar__count">{weekCount}</span>
        </button>
      </nav>

      <section className="todo-sidebar__section" aria-label="Tags">
        <div className="todo-sidebar__section-header">
          <span>TAGS</span>
          <button
            type="button"
            className="todo-sidebar__add-btn"
            aria-label="Add tag"
            aria-expanded={addingTag}
            onClick={() => setAddingTag((open) => !open)}
          >
            <Plus aria-hidden="true" />
          </button>
        </div>

        {addingTag ? (
          <form className="todo-sidebar__inline-form" onSubmit={submitTag}>
            <input
              type="text"
              value={tagName}
              maxLength={32}
              autoFocus
              aria-label="New tag name"
              placeholder="e.g. IELTS"
              onChange={(event) => setTagName(event.target.value)}
            />
            <button type="submit" disabled={!tagName.trim()}>Add</button>
          </form>
        ) : null}

        <div className="todo-sidebar__list">
          {tags.map((tag) => {
            const active = selectedTagId === tag.id
            return (
              <div key={tag.id} className={`todo-sidebar__filter-row${active ? ' todo-sidebar__filter-row--active' : ''}`}>
                <button
                  type="button"
                  className="todo-sidebar__filter-btn"
                  aria-pressed={active}
                  onClick={() => onSelectTag(active ? null : tag.id)}
                >
                  <span className="todo-sidebar__filter-label">#{tag.name}</span>
                </button>
                <button
                  type="button"
                  className="todo-sidebar__delete-btn"
                  aria-label={`Delete tag ${tag.name}`}
                  onClick={() => onDeleteTag(tag.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            )
          })}
          {tags.length === 0 && !addingTag ? (
            <p className="todo-sidebar__empty-hint">No tags yet</p>
          ) : null}
        </div>
      </section>

      <section className="todo-sidebar__section" aria-label="Priorities">
        <div className="todo-sidebar__section-header">
          <span>PRIORITIES</span>
          <button
            type="button"
            className="todo-sidebar__add-btn"
            aria-label="Add priority"
            aria-expanded={addingPriority}
            onClick={() => setAddingPriority((open) => !open)}
          >
            <Plus aria-hidden="true" />
          </button>
        </div>

        {addingPriority ? (
          <form className="todo-sidebar__priority-form" onSubmit={submitPriority}>
            <div className="todo-sidebar__inline-form">
              <input
                type="text"
                value={priorityName}
                maxLength={40}
                autoFocus
                aria-label="New priority name"
                placeholder="e.g. High"
                onChange={(event) => setPriorityName(event.target.value)}
              />
              <button type="submit" disabled={!priorityName.trim()}>Add</button>
            </div>
            <div className="todo-sidebar__tone-picker" role="radiogroup" aria-label="Priority color">
              {PRIORITY_TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={priorityTone === option.value}
                  aria-label={option.label}
                  className={`todo-sidebar__tone-dot todo-sidebar__tone-dot--${option.value}${priorityTone === option.value ? ' todo-sidebar__tone-dot--selected' : ''}`}
                  onClick={() => setPriorityTone(option.value)}
                />
              ))}
            </div>
          </form>
        ) : null}

        <div className="todo-sidebar__list">
          {priorities.map((priority) => {
            const active = selectedPriorityId === priority.id
            return (
              <div key={priority.id} className={`todo-sidebar__filter-row${active ? ' todo-sidebar__filter-row--active' : ''}`}>
                <button
                  type="button"
                  className="todo-sidebar__filter-btn"
                  aria-pressed={active}
                  onClick={() => onSelectPriority(active ? null : priority.id)}
                >
                  <span className="todo-sidebar__filter-label">{priority.name}</span>
                </button>
                <button
                  type="button"
                  className="todo-sidebar__delete-btn"
                  aria-label={`Delete priority ${priority.name}`}
                  onClick={() => onDeletePriority(priority.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            )
          })}
          {priorities.length === 0 && !addingPriority ? (
            <p className="todo-sidebar__empty-hint">No priorities yet</p>
          ) : null}
        </div>
      </section>
    </aside>
  )
}
