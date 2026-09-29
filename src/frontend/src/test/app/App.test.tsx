import { act, render, screen } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { useAuthStore } from '@/features/auth'

function todayInput() {
  const date = new Date()
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function currentWeek() {
  const today = todayInput()
  const [year, month, day] = today.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = -((date.getDay() + 6) % 7)
  date.setDate(date.getDate() + offset)
  const start = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
  date.setDate(date.getDate() + 6)
  const end = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
  return [start, end]
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })

  const today = todayInput()
  const [weekStart, weekEnd] = currentWeek()
  const timeZone = currentTimeZone()

  queryClient.setQueryData(['todo', 'items', today], [])
  queryClient.setQueryData(['todo', 'range', weekStart, weekEnd], [])
  queryClient.setQueryData(['vocab', 'boards'], [])
  queryClient.setQueryData(['review', 'dashboard'], { localDate: today, dueCount: 0 })
  queryClient.setQueryData(['settings'], {
    profile: {
      id: 'user-1',
      email: 'learner@example.com',
      fullName: 'FluentA Learner',
      isEmailVerified: true,
      bio: '',
    },
  })
  queryClient.setQueryData(['countdown', 'events'], [])
  queryClient.setQueryData(['habit', 'list', timeZone], [])
  queryClient.setQueryData(['journal', 'entries'], [])
  queryClient.setQueryData(['note', 'boards'], [])
  queryClient.setQueryData(['project', 'boards'], [])
  queryClient.setQueryData(['pomodoro', 'config'], {
    id: 'pomodoro-config-1',
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfter: 4,
    createdAt: '2026-06-12T00:00:00Z',
    updatedAt: '2026-06-12T00:00:00Z',
  })
  queryClient.setQueryData(['pomodoro', 'current'], {
    state: 'Idle',
    phase: 'Work',
    remainingSeconds: 1500,
    durationSeconds: 1500,
    startedAt: null,
    pausedAt: null,
    linkedTaskId: null,
    linkedTaskSource: null,
  })

  return queryClient
}

function renderWithClient(queryClient: QueryClient, initialEntry: string) {
  const router = createAppRouter([initialEntry])
  return render(
    <AppProviders queryClient={queryClient}>
      <App router={router} />
    </AppProviders>,
  )
}

async function renderApp(initialEntry: string) {
  const view = renderWithClient(createQueryClient(), initialEntry)
  await act(async () => { await vi.dynamicImportSettled() })
  return view
}

describe('FluentA app routes', async () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'anonymous', error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the login route with auth controls', async () => {
    await renderApp('/login')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up now' })).toBeInTheDocument()
  })

  it('protects the home route when anonymous', async () => {
    await renderApp('/')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows the dashboard and nav links when authenticated', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        fullName: 'FluentA Learner',
        avatarUrl: null,
      },
    })

    await renderApp('/')

    expect(screen.getByRole('heading', { name: /Good|Burning midnight oil/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vocabulary' })).toHaveAttribute('href', '/vocabulary')
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice')
    expect(screen.getByRole('button', { name: 'Review' })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(screen.getByRole('link', { name: 'Todo' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Habits' })).toHaveAttribute('href', '/habits')
    expect(screen.getByRole('link', { name: 'Countdowns' })).toHaveAttribute('href', '/countdowns')
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes')
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('href', '/project')
    expect(screen.getByRole('link', { name: 'Pomodoro' })).toHaveAttribute('href', '/pomodoro')
  })

  it('protects the notes route when anonymous', async () => {
    await renderApp('/notes')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('protects practice sessions when anonymous', async () => {
    await renderApp('/practice/page-1')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('renders the protected profile at its dedicated route', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'user-1', fullName: 'FluentA Learner', avatarUrl: null },
    })

    await renderApp('/profile')

    expect(screen.getByRole('main').querySelector('form h1')).toHaveTextContent('Profile')
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/profile')
    expect(screen.queryByRole('navigation', { name: 'Settings navigation' })).not.toBeInTheDocument()
  })

})
