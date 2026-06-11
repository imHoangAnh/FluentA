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
  queryClient.setQueryData(['countdown', 'events'], [])

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

  it('shows protected workspace when authenticated in memory', () => {
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

    expect(screen.getByText('learner@example.com')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Boards' })).toBeInTheDocument()
    expect(screen.getByTestId('board-name-input')).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'Open vocabulary' })).toBeInTheDocument()
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
