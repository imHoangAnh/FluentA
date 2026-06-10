import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './stores/authStore'

function renderApp(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  queryClient.setQueryData(['vocab', 'boards'], [])
  queryClient.setQueryData(['flashcard', 'decks'], [])

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
})
