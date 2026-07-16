import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  queryClient.setQueryData(['flashcard', 'boards'], [])
  queryClient.setQueryData(['review', 'dashboard'], {
    boardId: null,
    boardName: null,
    totalCards: 0,
    totalReviews: 0,
    streakDays: 0,
    retentionRate: 0,
    overdue: 0,
    dueToday: 0,
    newCards: 0,
    forecast: [],
  })
  queryClient.setQueryData(['review', 'settings'], { dailyLimit: 300, recapAfterAnswer: true })
  queryClient.setQueryData(['review', 'level-five'], [])
  queryClient.setQueryData(['practice', 'settings'], { modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] })
  queryClient.setQueryData(['settings'], {
    profile: {
      id: 'user-1',
      email: 'learner@example.com',
      fullName: 'FluentA Learner',
      isEmailVerified: true,
      bio: '',
    },
    practiceSettings: { modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] },
    reviewSettings: { dailyLimit: 300, recapAfterAnswer: true },
  })
  queryClient.setQueryData(['countdown', 'events'], [])
  queryClient.setQueryData(['habit', 'list', timeZone], [])
  queryClient.setQueryData(['journal', 'entries'], [])
  queryClient.setQueryData(['note', 'boards'], [])
  queryClient.setQueryData(['kanban', 'boards'], [])
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

async function renderAppWithDeck(initialEntry: string) {
  const queryClient = createQueryClient()

  const board = {
    boardId: 'board-1',
    boardName: 'HSK',
    boardLanguage: 'zh',
    pages: [{
      pageId: 'page-1',
      pageName: 'HSK - Unit 1',
      words: [{
      id: 'card-1',
      wordId: 'word-1',
      word: '你好',
      wordClass: 'phrase',
      meaningVn: 'xin chào',
      meaningEn: 'ni hao',
      example: '你好！',
      isInReview: false,
      reviewLevel: null,
      nextReviewDate: null,
      lapseCount: 0,
      }],
      isPracticed: false,
    }],
  }

  queryClient.setQueryData(['flashcard', 'boards'], [board])
  queryClient.setQueryData(['review', 'dashboard'], {
    boardId: null,
    boardName: null,
    totalCards: 1,
    totalReviews: 2,
    streakDays: 2,
    retentionRate: 100,
    overdue: 1,
    dueToday: 0,
    newCards: 1,
    forecast: [{ date: '2026-06-10', dueCount: 1 }],
  })
  queryClient.setQueryData(['flashcard', 'page-session', 'page-1'], {
    pageId: 'page-1',
    boardId: board.boardId,
    pageName: 'HSK - Unit 1',
    boardLanguage: board.boardLanguage,
    words: board.pages[0].words,
  })

  const view = renderWithClient(queryClient, initialEntry)
  await act(async () => { await vi.dynamicImportSettled() })
  return view
}

describe('FluentA app routes', async () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'anonymous', error: null })
  })

  it('renders the login route with auth controls', async () => {
    await renderApp('/login')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('protects the home route when anonymous', async () => {
    await renderApp('/')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows the dashboard and nav links when authenticated', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
      },
    })

    await renderApp('/')

    expect(screen.getByRole('heading', { name: /Good|Burning midnight oil/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vocabulary' })).toHaveAttribute('href', '/vocabulary')
    expect(screen.getByRole('link', { name: 'Flashcard' })).toHaveAttribute('href', '/flashcards')
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice')
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Todo' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Habits' })).toHaveAttribute('href', '/habits')
    expect(screen.getByRole('link', { name: 'Countdowns' })).toHaveAttribute('href', '/countdowns')
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/kanban')
    expect(screen.getByRole('link', { name: 'Pomodoro' })).toHaveAttribute('href', '/pomodoro')
  })

  it('protects the notes route when anonymous', async () => {
    await renderApp('/notes')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('renders the flashcard empty state for authenticated users', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    await renderApp('/flashcards')

    expect(screen.getByRole('heading', { name: 'No decks yet' })).toBeInTheDocument()
  })

  it('protects practice sessions when anonymous', async () => {
    await renderApp('/practice/page-1')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })

  it('opens the modal-first Practice flow and starts the selected deck directly', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    await renderAppWithDeck('/practice')

    fireEvent.click(screen.getByRole('button', { name: 'Practice HSK - Unit 1, 1 words' }))
    expect(screen.getByRole('heading', { name: 'Start practice' })).toBeInTheDocument()
    expect(screen.getByText('Dictation')).toBeInTheDocument()
    expect(screen.getByText('Meaning → Word')).toBeInTheDocument()
    expect(screen.getByText('Pronunciation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start practice' }))

    await waitFor(() => expect(screen.getByTestId('active-practice-card')).toBeInTheDocument())
  })

  it('renders the dedicated practice entry route with practice-first copy', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    await renderAppWithDeck('/practice?deck=page-1')

    expect(screen.getByRole('heading', { name: 'Start practice' })).toBeInTheDocument()
    expect(screen.getByText('HSK - Unit 1 · 1 word')).toBeInTheDocument()
    expect(screen.queryByText('Vocabulary page')).not.toBeInTheDocument()
  })

  it('renders the one-card flashcard viewer route from cached data', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    await renderAppWithDeck('/flashcards/pages/page-1')

    expect(screen.getByRole('heading', { name: 'HSK - Unit 1' })).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByTestId('flashcard-stage')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Let's practice" })).toHaveAttribute('href', '/practice?deck=page-1')
  })

  it('renders protected settings from cached data', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    await renderApp('/settings')

    const settingsNavigation = within(screen.getByRole('navigation', { name: 'Settings navigation' }))
    expect(settingsNavigation.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile')
    expect(settingsNavigation.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/settings/review')
    expect(settingsNavigation.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/settings/practice')
    expect(settingsNavigation.getByRole('link', { name: 'Level 5' })).toHaveAttribute('href', '/settings/level5')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    await waitFor(() => expect(settingsNavigation.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page'))
    expect(screen.queryByRole('heading', { name: 'Practice mode sequence' })).not.toBeInTheDocument()
  })

  it('renders split settings routes inside the shared shell', async () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    let view = await renderApp('/settings/practice')
    expect(screen.getByRole('heading', { name: 'Practice mode sequence' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Settings navigation' })).getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page')

    view.unmount()
    view = await renderApp('/settings/review')
    expect(screen.getByRole('heading', { name: 'Board review defaults' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Settings navigation' })).getByRole('link', { name: 'Review' })).toHaveAttribute('aria-current', 'page')

    view.unmount()
    await renderApp('/settings/level5')
    expect(screen.getByRole('heading', { name: 'Manage Level 5 words' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Level 5' })).toHaveAttribute('aria-current', 'page')
  })
})
