import type { TodoItem } from '../api/todo.api'

export type TodoSortMode = 'importance' | 'alphabetical' | 'creation'

export const TODO_SORT_STORAGE_KEY = 'fluenta.todo.my-day-sort.v1'

export const TODO_SORT_OPTIONS: ReadonlyArray<{ value: TodoSortMode; label: string }> = [
  { value: 'importance', label: 'Importance' },
  { value: 'alphabetical', label: 'Alphabetically' },
  { value: 'creation', label: 'Creation date' },
]

export function readTodoSortMode(): TodoSortMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(TODO_SORT_STORAGE_KEY)
  return TODO_SORT_OPTIONS.some((option) => option.value === value) ? value as TodoSortMode : null
}

export function writeTodoSortMode(mode: TodoSortMode | null) {
  if (typeof window === 'undefined') return
  if (mode) {
    window.localStorage.setItem(TODO_SORT_STORAGE_KEY, mode)
  } else {
    window.localStorage.removeItem(TODO_SORT_STORAGE_KEY)
  }
}

function byManualOrder(left: TodoItem, right: TodoItem) {
  return left.sortOrder - right.sortOrder || right.createdAt.localeCompare(left.createdAt)
}

export function sortTodoItems(items: TodoItem[], mode: TodoSortMode | null, completed: boolean) {
  return [...items].sort((left, right) => {
    if (mode === 'importance') {
      return Number(right.isImportant) - Number(left.isImportant) || byManualOrder(left, right)
    }

    if (mode === 'alphabetical') {
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' }) || byManualOrder(left, right)
    }

    if (mode === 'creation') {
      return right.createdAt.localeCompare(left.createdAt) || byManualOrder(left, right)
    }

    if (completed) {
      return (right.completedAt ?? right.updatedAt).localeCompare(left.completedAt ?? left.updatedAt)
        || byManualOrder(left, right)
    }

    return byManualOrder(left, right)
  })
}
