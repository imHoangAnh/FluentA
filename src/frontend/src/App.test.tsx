import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './stores/authStore'

function todayInput() {
  const date = new Date()
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function currentMonth() {
  return todayInput().slice(0, 7)
}

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function shiftDate(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function dayName(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(year, month - 1, day).getDay()]
}

function currentWeek() {
  const today = todayInput()
  const [year, month, day] = today.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const start = shiftDate(today, -((date.getDay() + 6) % 7))
  return [start, shiftDate(start, 6)]
}

function renderApp(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  queryClient.setQueryData(['todo', 'items', todayInput()], [])
  queryClient.setQueryData(['vocab', 'boards'], [])
  queryClient.setQueryData(['flashcard', 'decks'], [])
  queryClient.setQueryData(['flashcard', 'dashboard'], {
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
  queryClient.setQueryData(['flashcard', 'settings'], { newCardsPerDay: 20, reviewCardsPerDay: 200 })
  queryClient.setQueryData(['todo', 'items', todayInput()], [])
  const [weekStart, weekEnd] = currentWeek()
  queryClient.setQueryData(['todo', 'range', weekStart, weekEnd], [])
  queryClient.setQueryData(['countdown', 'events'], [])
  queryClient.setQueryData(['habit', 'list', currentTimeZone()], [])
  queryClient.setQueryData(['journal', 'entries'], [])
  queryClient.setQueryData(['kanban', 'boards'], [])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderAppWithDashboardData(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  const today = todayInput()
  const timeZone = currentTimeZone()
  queryClient.setQueryData(['todo', 'items', today], [{
    id: 'todo-1',
    title: 'Plan speaking practice',
    note: null,
    date: today,
    isCompleted: false,
    sortOrder: 1,
    isCarriedOver: false,
    carriedOverFromDate: null,
    createdAt: '2026-06-11T00:00:00Z',
    updatedAt: '2026-06-11T00:00:00Z',
  }])
  queryClient.setQueryData(['habit', 'list', timeZone], [{
    id: 'habit-1',
    name: 'Read English',
    description: '30 minutes',
    color: '#22C55E',
    icon: 'Book',
    frequency: 'Daily',
    customDays: [],
    currentStreak: 4,
    isScheduledToday: true,
    isCheckedToday: false,
    monthlyCompletionRate: 20,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  }])
  queryClient.setQueryData(['countdown', 'events'], [{
    id: 'countdown-1',
    name: 'IELTS Exam',
    targetDate: shiftDate(today, 10) + 'T09:00:00Z',
    color: '#16A34A',
    icon: 'Exam',
    isCompleted: false,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  }])
  queryClient.setQueryData(['flashcard', 'decks'], [{
    id: 'deck-1',
    boardId: 'board-1',
    boardName: 'All Words',
    boardLanguage: 'en',
    pageId: null,
    name: 'All Words',
    type: 'AllWords',
    cards: [{
      id: 'card-1',
      wordId: 'word-1',
      word: 'hello',
      wordClass: 'noun',
      meaningVn: 'xin chao',
      meaningEn: 'hello',
      example: 'hello',
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: null,
      state: 'new',
    }],
  }])
  queryClient.setQueryData(['flashcard', 'dashboard'], {
    boardId: null,
    boardName: null,
    totalCards: 1,
    totalReviews: 12,
    streakDays: 9,
    retentionRate: 90,
    overdue: 1,
    dueToday: 1,
    newCards: 1,
    forecast: [],
  })
  queryClient.setQueryData(['vocab', 'boards'], [])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderAppWithHabit(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  const today = todayInput()
  const timeZone = currentTimeZone()
  const habit = {
    id: 'habit-1',
    name: 'Read English',
    description: '30 minutes',
    color: '#22C55E',
    icon: 'Book',
    frequency: 'Custom',
    customDays: [dayName(today)],
    currentStreak: 3,
    isScheduledToday: true,
    isCheckedToday: true,
    monthlyCompletionRate: 10,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  }
  queryClient.setQueryData(['habit', 'list', timeZone], [habit])
  queryClient.setQueryData(['habit', 'entries', habit.id, currentMonth(), timeZone], [{ habitId: habit.id, date: today, isCompleted: true }])
  queryClient.setQueryData(['habit', 'entries', habit.id, shiftDate(currentMonth() + '-01', 32).slice(0, 7), timeZone], [])
  queryClient.setQueryData(['habit', 'stats', habit.id, timeZone], {
    habitId: habit.id,
    name: habit.name,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    frequency: habit.frequency,
    customDays: habit.customDays,
    currentStreak: 3,
    longestStreak: 8,
    last7DaysCompletionRate: 100,
    completedLast7Days: 1,
    scheduledLast7Days: 1,
    last30DaysCompletionRate: 70,
    completedLast30Days: 7,
    scheduledLast30Days: 10,
    asOfDate: today,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderAppWithDeck(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  queryClient.setQueryData(['flashcard', 'decks'], [{
    id: 'deck-1',
    boardId: 'board-1',
    boardName: 'HSK',
    boardLanguage: 'zh',
    pageId: 'page-1',
    name: 'HSK - Unit 1',
    type: 'PageDeck',
    cards: [{
      id: 'card-1',
      wordId: 'word-1',
      word: '你好',
      wordClass: 'phrase',
      meaningVn: 'xin chào',
      meaningEn: 'ni hao',
      example: '你好！',
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: null,
      state: 'new',
    }],
  }])
  queryClient.setQueryData(['flashcard', 'dashboard'], {
    boardId: null,
    boardName: null,
    totalCards: 1,
    totalReviews: 2,
    streakDays: 2,
    retentionRate: 100,
    overdue: 1,
    dueToday: 0,
    newCards: 1,
    forecast: [
      { date: '2026-06-10', dueCount: 1 },
      { date: '2026-06-11', dueCount: 0 },
      { date: '2026-06-12', dueCount: 0 },
      { date: '2026-06-13', dueCount: 0 },
      { date: '2026-06-14', dueCount: 0 },
      { date: '2026-06-15', dueCount: 0 },
      { date: '2026-06-16', dueCount: 0 },
    ],
  })
  queryClient.setQueryData(['flashcard', 'settings'], { newCardsPerDay: 20, reviewCardsPerDay: 200 })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FluentA auth app', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'anonymous', error: null })
  })

  it('renders login route', () => {
    renderApp('/login')

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('protects the workspace route when anonymous', () => {
    renderApp('/')

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows Dashboard Overview as the protected home when authenticated in memory', () => {
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

    renderApp('/')

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Good|Burning midnight oil/ })).toBeInTheDocument()
    expect(screen.getByTestId('open-vocabulary')).toHaveAttribute('href', '/vocabulary')
    expect(screen.getByTestId('open-flashcards')).toHaveAttribute('href', '/flashcards')
    expect(screen.getByTestId('open-todo')).toHaveAttribute('href', '/todo')
    expect(screen.getByTestId('open-habits')).toHaveAttribute('href', '/habits')
    expect(screen.getByTestId('open-countdown')).toHaveAttribute('href', '/countdown')
    expect(screen.getByTestId('open-journal')).toHaveAttribute('href', '/journal')
    expect(screen.getByTestId('open-kanban')).toHaveAttribute('href', '/kanban')
  })

  it('keeps the vocabulary workspace available at /vocabulary', () => {
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

    renderApp('/vocabulary')

    expect(screen.getByRole('heading', { name: 'Boards' })).toBeInTheDocument()
    expect(screen.getByTestId('board-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('open-dashboard')).toHaveAttribute('href', '/')
  })

  it('renders cached Dashboard widgets across productivity domains', () => {
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

    renderAppWithDashboardData('/')

    expect(screen.getByRole('heading', { name: '3 cards due' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review Now' })).toHaveAttribute('href', '/flashcards/decks/deck-1/review')
    expect(screen.getByTestId('dashboard-overview-streak')).toHaveTextContent('9 days')
    expect(screen.getByLabelText('Check todo Plan speaking practice')).toBeInTheDocument()
    expect(screen.getByLabelText('Check habit Read English')).toBeInTheDocument()
    expect(screen.getByText(/IELTS Exam/)).toBeInTheDocument()
  })

  it('protects flashcards and renders its empty state when authenticated', () => {
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

    renderApp('/flashcards')

    expect(screen.getByRole('heading', { name: 'Your synchronized decks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No decks yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open vocabulary' })).toHaveAttribute('href', '/vocabulary')
  })

  it('protects Page Deck review sessions when anonymous', () => {
    renderApp('/flashcards/decks/deck-1/review')

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('protects todo and renders its empty day state when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/todo')

    expect(screen.getByRole('heading', { name: 'Daily plan' })).toBeInTheDocument()
    expect(screen.getByTestId('todo-title-input')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No tasks for this day' })).toBeInTheDocument()
  })

  it('renders the seven-day Todo week view when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    const { container } = renderApp('/todo')
    fireEvent.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('heading', { name: 'Week plan' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Todo week' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-testid^="week-day-"]')).toHaveLength(7)
  })

  it('protects countdown and renders its empty state when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/countdown')

    expect(screen.getByRole('heading', { name: 'Important dates' })).toBeInTheDocument()
    expect(screen.getByTestId('countdown-name-input')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No countdowns yet' })).toBeInTheDocument()
  })

  it('protects habits and renders its empty grid state when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/habits')

    expect(screen.getByRole('heading', { name: 'Monthly rhythm' })).toBeInTheDocument()
    expect(screen.getByTestId('habit-name-input')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No habits yet' })).toBeInTheDocument()
  })

  it('protects journal and renders its rich-text editor when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/journal')

    expect(screen.getByRole('heading', { name: 'Language learning notes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No journal entries yet' })).toBeInTheDocument()
    expect(screen.getByTestId('journal-search-input')).toBeInTheDocument()
    expect(screen.getByTestId('journal-title-input')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByTestId('save-journal-button')).toBeDisabled()
  })

  it('protects kanban and renders its empty board state when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/kanban')

    expect(screen.getByRole('heading', { name: 'Kanban Board' })).toBeInTheDocument()
    expect(screen.getByTestId('kanban-board-name-input')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No Kanban boards yet' })).toBeInTheDocument()
  })

  it('renders habit summaries and disables ineligible grid cells', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderAppWithHabit('/habits')

    const today = todayInput()
    expect(screen.getByRole('heading', { name: 'Read English' })).toBeInTheDocument()
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View stats for Read English' })).toHaveAttribute('href', '/habits/habit-1/stats')
    expect(screen.getByTestId(`habit-cell-habit-1-${today}`)).toHaveTextContent('✓')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getAllByTestId(/habit-cell-habit-1-/)[0]).toBeDisabled()
  })

  it('renders protected habit stats from backend-owned statistics', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderAppWithHabit('/habits/habit-1/stats')

    expect(screen.getByRole('heading', { name: 'Read English' })).toBeInTheDocument()
    expect(screen.getByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText('Longest streak')).toBeInTheDocument()
    expect(screen.getByText('8 days')).toBeInTheDocument()
    expect(screen.getByText('7/10 scheduled days complete')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to monthly grid' })).toHaveAttribute('href', '/habits')
  })

  it('requires a custom weekday before saving a custom habit', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/habits')

    fireEvent.change(screen.getByTestId('habit-name-input'), { target: { value: 'Workout' } })
    fireEvent.change(screen.getByTestId('habit-frequency-select'), { target: { value: 'Custom' } })
    expect(screen.getByTestId('save-habit-button')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Mon'))
    expect(screen.getByTestId('save-habit-button')).not.toBeDisabled()
  })

  it('renders protected review settings when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/settings/review')

    expect(screen.getByRole('heading', { name: 'Shape your daily practice' })).toBeInTheDocument()
    expect(screen.getByLabelText('New cards per day')).toHaveValue(20)
    expect(screen.getByLabelText('Review cards per day')).toHaveValue(200)
  })

  it('adapts flashcard viewer labels to board language', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderAppWithDeck('/flashcards')

    expect(screen.getByRole('heading', { name: 'Your synchronized decks' })).toBeInTheDocument()
    expect(screen.getByText('Pinyin')).toBeInTheDocument()
    expect(screen.getByText('ni hao')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-streak')).toHaveTextContent('2 days')
    expect(screen.getByTestId('dashboard-retention')).toHaveTextContent('100%')
  })
})
