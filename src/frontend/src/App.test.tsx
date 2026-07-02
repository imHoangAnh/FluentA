import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './stores/authStore'

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
  queryClient.setQueryData(['flashcard', 'settings'], { dailyLimit: 300, recapAfterAnswer: true })
  queryClient.setQueryData(['flashcard', 'practice-settings'], { modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] })
  queryClient.setQueryData(['settings'], {
    profile: {
      id: 'user-1',
      email: 'learner@example.com',
      fullName: 'FluentA Learner',
      isEmailVerified: true,
      bio: '',
      avatarUrl: null,
    },
    practiceSettings: { modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] },
    reviewSettings: { dailyLimit: 300, recapAfterAnswer: true },
  })
  queryClient.setQueryData(['countdown', 'events'], [])
  queryClient.setQueryData(['habit', 'list', timeZone], [])
  queryClient.setQueryData(['journal', 'entries'], [])
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
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderApp(initialEntry: string) {
  return renderWithClient(createQueryClient(), initialEntry)
}

function renderAppWithDashboardData(initialEntry: string) {
  const queryClient = createQueryClient()
  const today = todayInput()

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
  queryClient.setQueryData(['flashcard', 'decks'], [{
    id: 'deck-1',
    boardId: 'board-1',
    boardName: 'IELTS',
    boardLanguage: 'en',
    pageId: 'page-1',
    name: 'IELTS - Unit 1',
    type: 'PageDeck',
    cards: [{
      id: 'card-1',
      wordId: 'word-1',
      word: 'hello',
      wordClass: 'noun',
      meaningVn: 'xin chao',
      meaningEn: 'hello',
      example: 'hello',
      reviewLevel: null,
      nextReviewDate: null,
      lapseCount: 0,
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
  queryClient.setQueryData(['habit', 'list', currentTimeZone()], [{
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
    targetDate: '2026-07-10T09:00:00Z',
    color: '#16A34A',
    icon: 'Exam',
    isCompleted: false,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  }])

  return renderWithClient(queryClient, initialEntry)
}

function renderAppWithDeck(initialEntry: string) {
  const queryClient = createQueryClient()

  const deck = {
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
      reviewLevel: null,
      nextReviewDate: null,
      lapseCount: 0,
    }],
  }

  queryClient.setQueryData(['flashcard', 'decks'], [deck])
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
    forecast: [{ date: '2026-06-10', dueCount: 1 }],
  })
  queryClient.setQueryData(['flashcard', 'deck-session', 'deck-1'], {
    deckId: deck.id,
    boardId: deck.boardId,
    deckName: deck.name,
    deckType: deck.type,
    boardLanguage: deck.boardLanguage,
    cards: deck.cards,
  })

  return renderWithClient(queryClient, initialEntry)
}

describe('FluentA app routes', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'anonymous', error: null })
  })

  it('renders the login route with auth controls', () => {
    renderApp('/login')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('protects the home route when anonymous', () => {
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows the dashboard and nav links when authenticated', () => {
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

    expect(screen.getByRole('heading', { name: /Good|Burning midnight oil/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vocabulary' })).toHaveAttribute('href', '/vocabulary')
    expect(screen.getByRole('link', { name: 'Flashcard' })).toHaveAttribute('href', '/flashcards')
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/flashcards/practice')
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Todo' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Habits' })).toHaveAttribute('href', '/habits')
    expect(screen.getByRole('link', { name: 'Countdowns' })).toHaveAttribute('href', '/countdown')
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/kanban')
    expect(screen.getByRole('link', { name: 'Pomodoro' })).toHaveAttribute('href', '/pomodoro')
  })

  it('renders cached dashboard widgets across domains', () => {
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

    expect(screen.getByRole('link', { name: 'Open Review' })).toHaveAttribute('href', '/review')
    expect(screen.getByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.getByText('Read English')).toBeInTheDocument()
    expect(screen.getByText(/IELTS Exam/)).toBeInTheDocument()
  })

  it('renders the flashcard empty state for authenticated users', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/flashcards')

    expect(screen.getByRole('heading', { name: 'Your page decks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No decks yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open vocabulary' })).toHaveAttribute('href', '/vocabulary')
  })

  it('protects practice sessions when anonymous', () => {
    renderApp('/flashcards/decks/deck-1/practice')

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows a practice entry for non-empty decks and renders practice mode selection', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    const { unmount } = renderAppWithDeck('/flashcards')

    expect(screen.getByRole('link', { name: 'Practice this Page Deck' })).toHaveAttribute('href', '/flashcards/decks/deck-1/practice')
    expect(screen.getByRole('link', { name: 'Open Flashcards' })).toHaveAttribute('href', '/flashcards/decks/deck-1')

    unmount()
    renderAppWithDeck('/flashcards/decks/deck-1/practice')

    expect(screen.getByRole('heading', { name: 'HSK - Unit 1' })).toBeInTheDocument()
    expect(screen.getByText('dictation')).toBeInTheDocument()
    expect(screen.getByText('Meaning -> Word')).toBeInTheDocument()
    expect(screen.getByText('pronunciation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeInTheDocument()
  })

  it('renders the dedicated practice entry route with practice-first copy', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderAppWithDeck('/flashcards/practice')

    expect(screen.getByRole('heading', { name: 'Choose a page deck to practice' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Practice this Page Deck' })).toHaveAttribute('href', '/flashcards/decks/deck-1/practice')
    expect(screen.getByRole('link', { name: 'Open Flashcards' })).toHaveAttribute('href', '/flashcards/decks/deck-1')
  })

  it('renders the one-card flashcard viewer route from cached data', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderAppWithDeck('/flashcards/decks/deck-1')

    expect(screen.getByRole('heading', { name: 'HSK - Unit 1' })).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByTestId('flashcard-stage')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Let's practice" })).toHaveAttribute('href', '/flashcards/decks/deck-1/practice')
  })

  it('renders protected settings from cached data', () => {
    useAuthStore.setState({
      accessToken: 'memory-token',
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'FluentA Learner', isEmailVerified: true },
    })

    renderApp('/settings')

    expect(screen.getByRole('heading', { name: 'Your settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Practice mode sequence' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Board review defaults' })).toBeInTheDocument()
    expect(screen.getByLabelText('Daily limit')).toHaveValue(300)
    expect(screen.getByRole('checkbox', { name: 'Recap after each correct answer' })).toBeChecked()
  })
})
