import { fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type RuntimeName = 'todo' | 'habit' | 'kanban' | 'pomodoro'

const lifecycle = vi.hoisted(() => ({
  active: { todo: 0, habit: 0, kanban: 0, pomodoro: 0 } as Record<RuntimeName, number>,
  maximum: { todo: 0, habit: 0, kanban: 0, pomodoro: 0 } as Record<RuntimeName, number>,
}))

function runtimeMock(hookName: string, runtimeName: RuntimeName) {
  return async () => {
    const { useEffect } = await import('react')
    return {
      [hookName]: () => useEffect(() => {
        lifecycle.active[runtimeName] += 1
        lifecycle.maximum[runtimeName] = Math.max(
          lifecycle.maximum[runtimeName],
          lifecycle.active[runtimeName],
        )
        return () => {
          lifecycle.active[runtimeName] -= 1
        }
      }, []),
    }
  }
}

vi.mock('@/lib/realtime/useTodoSync', runtimeMock('useTodoSync', 'todo'))
vi.mock('@/lib/realtime/useHabitSync', runtimeMock('useHabitSync', 'habit'))
vi.mock('@/lib/realtime/useKanbanSync', runtimeMock('useKanbanSync', 'kanban'))
vi.mock('@/lib/realtime/usePomodoroSync', runtimeMock('usePomodoroSync', 'pomodoro'))

import { ProtectedRuntime } from '@/app/runtime/ProtectedRuntime'

function AuthenticatedTree() {
  const [authenticated, setAuthenticated] = useState(true)
  if (!authenticated) return <p>Logged out</p>

  return (
    <>
      <button type="button" onClick={() => setAuthenticated(false)}>Log out</button>
      <MemoryRouter initialEntries={['/first']}>
        <Routes>
          <Route element={<ProtectedRuntime />}>
            <Route path="/first" element={<Link to="/second">Next route</Link>} />
            <Route path="/second" element={<p>Second route</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </>
  )
}

describe('ProtectedRuntime lifecycle', () => {
  beforeEach(() => {
    for (const name of Object.keys(lifecycle.active) as RuntimeName[]) {
      lifecycle.active[name] = 0
      lifecycle.maximum[name] = 0
    }
  })

  it('retains one subscription per adapter across StrictMode and navigation, then cleans up on logout', () => {
    render(<StrictMode><AuthenticatedTree /></StrictMode>)

    for (const name of Object.keys(lifecycle.active) as RuntimeName[]) {
      expect(lifecycle.active[name]).toBe(1)
      expect(lifecycle.maximum[name]).toBe(1)
    }

    fireEvent.click(screen.getByRole('link', { name: 'Next route' }))
    expect(screen.getByText('Second route')).toBeInTheDocument()
    for (const name of Object.keys(lifecycle.active) as RuntimeName[]) {
      expect(lifecycle.active[name]).toBe(1)
      expect(lifecycle.maximum[name]).toBe(1)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByText('Logged out')).toBeInTheDocument()
    for (const name of Object.keys(lifecycle.active) as RuntimeName[]) {
      expect(lifecycle.active[name]).toBe(0)
    }
  })
})
