import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Check, Plus, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { dropdownContentClassName, dropdownItemClassName } from '@/shared/components/ui/dropdown-styles'
import { TimePicker } from '@/shared/components/ui/time-picker'
import { formatTimeValue, parseTimeValue } from '@/shared/components/ui/time-picker-utils'
import type {
  TodoItem,
  TodoPriority,
  TodoRepeatPattern,
  TodoSubtask,
  TodoTag,
  UpdateTodoInput,
} from '../api/todo.api'
import { formatDetailDate } from '../model/todo-date'

const SCHEDULE_STEP = 15
const SCHEDULE_LATEST_END = 23 * 60 + 45

function toScheduleMinutes(value: string) {
  const time = parseTimeValue(value)
  return time ? time.hour * 60 + time.minute : 0
}

function fromScheduleMinutes(minutes: number) {
  return formatTimeValue({
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    second: 0,
  })
}


const repeatOptions: Array<{ value: TodoRepeatPattern | null; label: string }> = [
  { value: null, label: 'Does not repeat' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekdays', label: 'Weekdays' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
]

type TodoDetailsPanelProps = {
  item: TodoItem
  today: string
  priorities: TodoPriority[]
  tags: TodoTag[]
  pending: boolean
  suspendEscape?: boolean
  onClose: () => void
  onUpdate: (id: string, patch: UpdateTodoInput) => Promise<void>
  onDelete: (item: TodoItem) => void
  onCreateTag: (name: string) => Promise<TodoTag | null>
  onAddSubtask: (todoId: string, title: string) => Promise<TodoSubtask | null>
  onToggleSubtask: (todoId: string, subtask: TodoSubtask) => Promise<void>
  onDeleteSubtask: (todoId: string, subtaskId: string) => Promise<void>
}

export function TodoDetailsPanel({
  item,
  today,
  priorities,
  tags,
  pending,
  suspendEscape = false,
  onClose,
  onUpdate,
  onDelete,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TodoDetailsPanelProps) {
  const scheduleId = useId()
  const [title, setTitle] = useState(item.title)
  const [scheduledStartTime, setScheduledStartTime] = useState<string | null>(() => {
    const parsed = parseTimeValue(item.scheduledStartTime)
    return parsed ? formatTimeValue(parsed) : null
  })
  const [scheduledEndTime, setScheduledEndTime] = useState<string | null>(() => {
    const parsed = parseTimeValue(item.scheduledEndTime)
    return parsed ? formatTimeValue(parsed) : null
  })
  const [repeatPattern, setRepeatPattern] = useState<TodoRepeatPattern | null>(item.repeatPattern ?? null)
  const [priorityId, setPriorityId] = useState<string | null>(item.priorityId ?? null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => (item.tags ?? []).map((tag) => tag.id))
  const [note, setNote] = useState(item.note ?? '')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const tagsPopoverRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = titleInputRef.current
    input?.focus()
    if (input) input.scrollLeft = 0
  }, [item.id])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || suspendEscape || event.defaultPrevented) return
      if (tagsMenuOpen) {
        setTagsMenuOpen(false)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, suspendEscape, tagsMenuOpen])

  useEffect(() => {
    if (!tagsMenuOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (tagsPopoverRef.current && !tagsPopoverRef.current.contains(event.target as Node)) {
        setTagsMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [tagsMenuOpen])

  const subtasks = item.subtasks ?? []
  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length
  const subtaskPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0

  const activePriority = priorities.find((priority) => priority.id === priorityId) ?? null
  const activeTags = tags.filter((tag) => selectedTagIds.includes(tag.id))

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    )
  }

  function handleChangeStart(next: string | null) {
    setScheduleError(null)
    setScheduledStartTime(next)
    if (!next || !scheduledEndTime) return
    const shift = scheduledStartTime
      ? toScheduleMinutes(next) - toScheduleMinutes(scheduledStartTime)
      : 0
    const shifted = Math.max(
      toScheduleMinutes(scheduledEndTime) + shift,
      toScheduleMinutes(next) + SCHEDULE_STEP,
    )
    setScheduledEndTime(fromScheduleMinutes(Math.min(shifted, SCHEDULE_LATEST_END)))
  }

  async function handleAddInlineTag(event: FormEvent) {
    event.preventDefault()
    const normalized = newTagName.trim().replace(/^#+/, '')
    if (!normalized) return
    const created = await onCreateTag(normalized)
    if (created) {
      setSelectedTagIds((current) => (current.includes(created.id) ? current : [...current, created.id]))
      setNewTagName('')
    }
  }

  async function handleAddSubtask(event: FormEvent) {
    event.preventDefault()
    const normalized = newSubtaskTitle.trim()
    if (!normalized) return
    const created = await onAddSubtask(item.id, normalized)
    if (created) {
      setNewSubtaskTitle('')
    }
  }

  async function handleSave() {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setTitle(item.title)
      return
    }

    const start = scheduledStartTime || null
    const end = scheduledEndTime || null

    if (end && !start) {
      setScheduleError('Start time is required when end time is set.')
      return
    }
    if (start && end && end <= start) {
      setScheduleError('End time must be after start time.')
      return
    }
    setScheduleError(null)

    const patch: UpdateTodoInput = {}
    if (normalizedTitle !== item.title) patch.title = normalizedTitle

    const originalStartParsed = parseTimeValue(item.scheduledStartTime)
    const originalEndParsed = parseTimeValue(item.scheduledEndTime)
    const itemStart = originalStartParsed ? formatTimeValue(originalStartParsed) : null
    const itemEnd = originalEndParsed ? formatTimeValue(originalEndParsed) : null
    if (start !== itemStart || end !== itemEnd) {
      patch.scheduledStartTime = start
      patch.scheduledEndTime = end
    }

    if (repeatPattern !== (item.repeatPattern ?? null)) {
      patch.repeatPattern = repeatPattern
    }

    if (priorityId !== (item.priorityId ?? null)) {
      patch.priorityId = priorityId
    }

    const originalTagIds = [...(item.tags ?? []).map((tag) => tag.id)].sort()
    const nextTagIds = [...selectedTagIds].sort()
    if (originalTagIds.length !== nextTagIds.length || originalTagIds.some((id, index) => id !== nextTagIds[index])) {
      patch.tagIds = selectedTagIds
    }

    if (note !== (item.note ?? '')) {
      patch.note = note
    }

    if (Object.keys(patch).length === 0) return

    try {
      await onUpdate(item.id, patch)
    } catch {
      // Error toast is handled by mutation.
    }
  }

  return (
    <aside className="todo-details" aria-label={`Details for ${item.title}`} aria-busy={pending}>
      <div className="todo-details__body">
        <div className="todo-details__header">
          <h2>Task Details</h2>
          <button type="button" className="todo-details__close-btn" aria-label="Close details" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="todo-details__title-wrap">
          <label className="sr-only" htmlFor={`todo-title-${item.id}`}>Task title</label>
          <input
            ref={titleInputRef}
            id={`todo-title-${item.id}`}
            data-testid="todo-details-title-input"
            className={`todo-details__title-input${item.isCompleted ? ' todo-details__title-input--completed' : ''}`}
            value={title}
            maxLength={240}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleSave()
              }
            }}
          />
        </div>

        <div className="todo-details__meta-box">
          <div className="todo-details__kv-row">
            <span className="todo-details__kv-label">Date</span>
            <span className="todo-details__kv-value">{formatDetailDate(item.date, today)}</span>
          </div>

          <div className="todo-details__kv-row">
            <span className="todo-details__kv-label">Scheduled</span>
            <div className="todo-details__schedule-grid">
              <TimePicker
                id={`${scheduleId}-start`}
                minuteStep={SCHEDULE_STEP}
                max="23:30"
                value={scheduledStartTime}
                onValueChange={handleChangeStart}
                className="h-7 px-2 text-xs"
                aria-label="Scheduled start time"
              />
              <TimePicker
                id={`${scheduleId}-end`}
                minuteStep={SCHEDULE_STEP}
                min={scheduledStartTime ? fromScheduleMinutes(toScheduleMinutes(scheduledStartTime) + SCHEDULE_STEP) : undefined}
                value={scheduledEndTime}
                onValueChange={(next) => {
                  setScheduleError(null)
                  setScheduledEndTime(next)
                }}
                className="h-7 px-2 text-xs"
                aria-label="Scheduled end time"
              />
            </div>
          </div>
          {scheduleError ? <p className="todo-details__inline-error" role="alert">{scheduleError}</p> : null}

          <div className="todo-details__kv-row">
            <span className="todo-details__kv-label">Repeat</span>
            <Menu as="div" className="relative inline-block">
              <MenuButton
                type="button"
                className="todo-details__kv-trigger"
                aria-label={`Repeat: ${repeatPattern ?? 'Does not repeat'}`}
              >
                {repeatPattern ?? 'Does not repeat'}
              </MenuButton>
              <MenuItems anchor={{ to: 'bottom end', gap: '6px' }} transition className={dropdownContentClassName}>
                {repeatOptions.map((option) => (
                  <MenuItem
                    as="button"
                    type="button"
                    className={dropdownItemClassName}
                    key={option.value ?? 'none'}
                    onClick={() => setRepeatPattern(option.value)}
                  >
                    <span className="todo-details__menu-check">
                      {repeatPattern === option.value ? <Check aria-hidden="true" /> : null}
                    </span>
                    {option.label}
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>
          </div>

          <div className="todo-details__kv-row">
            <span className="todo-details__kv-label">Priority</span>
            <Menu as="div" className="relative inline-block">
              <MenuButton
                type="button"
                className="todo-details__kv-trigger"
                aria-label={`Priority: ${activePriority?.name ?? 'None'}`}
              >
                {activePriority?.name ?? 'None'}
              </MenuButton>
              <MenuItems anchor={{ to: 'bottom end', gap: '6px' }} transition className={dropdownContentClassName}>
                <MenuItem
                  as="button"
                  type="button"
                  className={dropdownItemClassName}
                  onClick={() => setPriorityId(null)}
                >
                  <span className="todo-details__menu-check">
                    {priorityId === null ? <Check aria-hidden="true" /> : null}
                  </span>
                  None
                </MenuItem>
                {priorities.map((priority) => (
                  <MenuItem
                    as="button"
                    type="button"
                    className={dropdownItemClassName}
                    key={priority.id}
                    onClick={() => setPriorityId(priority.id)}
                  >
                    <span className="todo-details__menu-check">
                      {priorityId === priority.id ? <Check aria-hidden="true" /> : null}
                    </span>
                    {priority.name}
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>
          </div>

          <div className="todo-details__kv-row" ref={tagsPopoverRef}>
            <span className="todo-details__kv-label">Tags</span>
            <div className="relative">
              <button
                type="button"
                className="todo-details__kv-trigger"
                aria-label="Edit task tags"
                aria-expanded={tagsMenuOpen}
                onClick={() => setTagsMenuOpen((open) => !open)}
              >
                {activeTags.length > 0 ? activeTags.map((tag) => `#${tag.name}`).join(', ') : 'None'}
              </button>

              {tagsMenuOpen ? (
                <div className="todo-details__tags-popover" role="dialog" aria-label="Select tags">
                  <div className="todo-details__tags-list">
                    {tags.map((tag) => {
                      const checked = selectedTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className="todo-details__tag-option"
                          aria-pressed={checked}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <span className="todo-details__menu-check">
                            {checked ? <Check aria-hidden="true" /> : null}
                          </span>
                          <span>#{tag.name}</span>
                        </button>
                      )
                    })}
                    {tags.length === 0 ? (
                      <p className="todo-details__tags-empty">No tags yet. Create one below.</p>
                    ) : null}
                  </div>
                  <form className="todo-details__tags-create" onSubmit={handleAddInlineTag}>
                    <input
                      type="text"
                      value={newTagName}
                      maxLength={32}
                      aria-label="Create tag in details"
                      placeholder="New tag..."
                      onChange={(event) => setNewTagName(event.target.value)}
                    />
                    <button type="submit" disabled={!newTagName.trim()}>Add</button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <section className="todo-details__subtasks" aria-label="Subtasks">
          <div className="todo-details__subtasks-header">
            <span>SUBTASKS ({completedSubtasks} / {subtasks.length})</span>
            <strong>{subtaskPercent}%</strong>
          </div>

          <div className="todo-details__subtask-list">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="todo-details__subtask-row">
                <button
                  type="button"
                  className={`todo-details__subtask-check${subtask.isCompleted ? ' todo-details__subtask-check--checked' : ''}`}
                  aria-label={subtask.isCompleted ? `Mark subtask ${subtask.title} as active` : `Mark subtask ${subtask.title} as completed`}
                  aria-pressed={subtask.isCompleted}
                  onClick={() => void onToggleSubtask(item.id, subtask)}
                >
                  {subtask.isCompleted ? <Check aria-hidden="true" /> : null}
                </button>
                <span className={`todo-details__subtask-title${subtask.isCompleted ? ' todo-details__subtask-title--completed' : ''}`}>
                  {subtask.title}
                </span>
                <button
                  type="button"
                  className="todo-details__subtask-delete"
                  aria-label={`Delete subtask ${subtask.title}`}
                  onClick={() => void onDeleteSubtask(item.id, subtask.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <form className="todo-details__subtask-add" onSubmit={handleAddSubtask}>
            <Plus aria-hidden="true" />
            <input
              type="text"
              value={newSubtaskTitle}
              maxLength={240}
              aria-label="Add subtask"
              placeholder="Add subtask..."
              onChange={(event) => setNewSubtaskTitle(event.target.value)}
            />
          </form>
        </section>

        <div className="todo-details__notes-card">
          <label htmlFor={`todo-note-${item.id}`}>NOTES</label>
          <textarea
            id={`todo-note-${item.id}`}
            value={note}
            maxLength={4000}
            placeholder="Add a note..."
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>

      <footer className="todo-details__footer">
        <button
          type="button"
          className="todo-details__delete-btn"
          aria-label="Delete task"
          onClick={() => onDelete(item)}
        >
          Delete
        </button>

        <button
          type="button"
          className="todo-details__save-btn"
          disabled={pending || !title.trim()}
          onClick={() => void handleSave()}
        >
          {pending ? 'Saving...' : 'Save'}
        </button>
      </footer>
    </aside>
  )
}
