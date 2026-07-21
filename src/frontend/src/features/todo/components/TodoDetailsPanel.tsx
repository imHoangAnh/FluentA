import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Circle, Repeat2, Star, Trash2, X } from 'lucide-react'
import type { TodoItem, TodoRepeatPattern, UpdateTodoInput } from '../api/todo.api'

const repeatOptions: Array<{ value: TodoRepeatPattern | null; label: string }> = [
  { value: null, label: 'Does not repeat' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekdays', label: 'Weekdays' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
]

const repeatMenuClass = 'todo-details__repeat-menu'
const repeatMenuItemClass = 'todo-details__repeat-option'

type TodoDetailsPanelProps = {
  item: TodoItem
  pending: boolean
  onClose: () => void
  onUpdate: (id: string, patch: UpdateTodoInput) => Promise<void>
  onDelete: (item: TodoItem) => void
}

export function TodoDetailsPanel({ item, pending, onClose, onUpdate, onDelete }: TodoDetailsPanelProps) {
  const [title, setTitle] = useState(item.title)
  const [note, setNote] = useState(item.note ?? '')
  const savedTitle = useRef(item.title)
  const savedNote = useRef(item.note ?? '')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = titleInputRef.current
    input?.focus()
    if (input) input.scrollLeft = 0
  }, [item.id])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function saveTitle() {
    const normalized = title.trim()
    if (!normalized) {
      setTitle(savedTitle.current)
      return
    }
    if (normalized === savedTitle.current) {
      setTitle(normalized)
      return
    }
    const previous = savedTitle.current
    savedTitle.current = normalized
    setTitle(normalized)
    try {
      await onUpdate(item.id, { title: normalized })
    } catch {
      savedTitle.current = previous
      setTitle(previous)
    }
  }

  async function saveNote() {
    if (note === savedNote.current) return
    const previous = savedNote.current
    savedNote.current = note
    try {
      await onUpdate(item.id, { note })
    } catch {
      savedNote.current = previous
      setNote(previous)
    }
  }

  return (
    <aside className="todo-details" aria-label={`Details for ${item.title}`} aria-busy={pending}>
      <div className="todo-details__topbar">
        <span>Task details</span>
        <button type="button" aria-label="Close details" onClick={onClose}><X aria-hidden="true" /></button>
      </div>
      <div className="todo-details__identity">
        <button
          className="todo-details__complete"
          type="button"
          aria-label={item.isCompleted ? `Mark ${item.title} as active` : `Mark ${item.title} as completed`}
          onClick={() => void onUpdate(item.id, { isCompleted: !item.isCompleted })}
        >
          {item.isCompleted ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
        </button>
        <label className="sr-only" htmlFor={`todo-title-${item.id}`}>Task title</label>
        <input
          ref={titleInputRef}
          id={`todo-title-${item.id}`}
          className={item.isCompleted ? 'todo-details__title todo-details__title--completed' : 'todo-details__title'}
          value={title}
          maxLength={240}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void saveTitle()
            }
          }}
        />
        <button
          className={`todo-details__important${item.isImportant ? ' todo-details__important--active' : ''}`}
          type="button"
          aria-label={item.isImportant ? 'Remove importance' : 'Mark as important'}
          aria-pressed={item.isImportant}
          onClick={() => void onUpdate(item.id, { isImportant: !item.isImportant })}
        >
          <Star aria-hidden="true" fill={item.isImportant ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="todo-details__fields">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="todo-details__field"
              type="button"
              aria-label={`Repeat: ${item.repeatPattern ?? 'Does not repeat'}`}
              disabled={pending}
            >
              <Repeat2 aria-hidden="true" />
              <span>
                <small>Repeat</small>
                <strong>{item.repeatPattern ?? 'Does not repeat'}</strong>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={repeatMenuClass} sideOffset={6} align="start">
              {repeatOptions.map((option) => (
                <DropdownMenu.Item
                  className={repeatMenuItemClass}
                  key={option.value ?? 'none'}
                  onSelect={() => void onUpdate(item.id, { repeatPattern: option.value }).catch(() => undefined)}
                >
                  <span className="todo-details__repeat-check">
                    {item.repeatPattern === option.value ? <Check aria-hidden="true" /> : null}
                  </span>
                  {option.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className="todo-details__note">
        <label htmlFor={`todo-note-${item.id}`}>Note</label>
        <textarea
          id={`todo-note-${item.id}`}
          value={note}
          maxLength={4000}
          placeholder="Add a note"
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => void saveNote()}
        />
      </div>
      <div className="todo-details__footer">
        <button type="button" aria-label="Delete task" onClick={() => onDelete(item)}>
          <Trash2 aria-hidden="true" />
          <span>Delete task</span>
        </button>
      </div>
    </aside>
  )
}
