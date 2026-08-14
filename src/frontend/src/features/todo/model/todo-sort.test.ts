import { afterEach, describe, expect, it } from 'vitest'
import type { TodoItem } from '../api/todo.api'
import { readTodoSortMode, sortTodoItems, TODO_SORT_STORAGE_KEY, writeTodoSortMode } from './todo-sort'

function todo(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id,
    title: id,
    note: null,
    date: '2026-07-22',
    sortOrder: 0,
    isCompleted: false,
    isImportant: false,
    completedAt: null,
    createdAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => window.localStorage.clear())

describe('Todo My Day sorting', () => {
  it('supports importance, alphabetical, and newest-creation sorting', () => {
    const items = [
      todo('b', { title: 'Beta', sortOrder: 0, createdAt: '2026-07-21T00:00:00Z' }),
      todo('a', { title: 'alpha', sortOrder: 1, isImportant: true, createdAt: '2026-07-22T00:00:00Z' }),
    ]

    expect(sortTodoItems(items, 'importance', false).map((item) => item.id)).toEqual(['a', 'b'])
    expect(sortTodoItems(items, 'alphabetical', false).map((item) => item.id)).toEqual(['a', 'b'])
    expect(sortTodoItems(items, 'creation', false).map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('uses newest completion for the default completed order', () => {
    const items = [
      todo('older', { isCompleted: true, completedAt: '2026-07-21T01:00:00Z' }),
      todo('newer', { isCompleted: true, completedAt: '2026-07-22T01:00:00Z' }),
    ]

    expect(sortTodoItems(items, null, true).map((item) => item.id)).toEqual(['newer', 'older'])
  })

  it('stores a supported browser-local sort mode and rejects unknown values', () => {
    writeTodoSortMode('importance')
    expect(window.localStorage.getItem(TODO_SORT_STORAGE_KEY)).toBe('importance')
    expect(readTodoSortMode()).toBe('importance')

    window.localStorage.setItem(TODO_SORT_STORAGE_KEY, 'unknown')
    expect(readTodoSortMode()).toBeNull()
    writeTodoSortMode(null)
    expect(window.localStorage.getItem(TODO_SORT_STORAGE_KEY)).toBeNull()
  })
})
