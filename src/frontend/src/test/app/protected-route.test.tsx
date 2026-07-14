import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/app/route-guards/ProtectedRoute'
import { useAuthStore } from '@/features/auth'

const originalState = useAuthStore.getState()

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Private page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  useAuthStore.setState(originalState, true)
})

describe('ProtectedRoute session states', () => {
  it('announces checking and initializes an idle session', () => {
    const loadMe = vi.fn(async () => undefined)
    useAuthStore.setState({ ...originalState, status: 'idle', user: null, loadMe }, true)

    renderGuard()

    expect(screen.getByRole('status')).toHaveTextContent('Checking your FluentA session...')
    expect(loadMe).toHaveBeenCalledTimes(1)
  })

  it('redirects an anonymous session to login', () => {
    useAuthStore.setState({ ...originalState, status: 'anonymous', user: null }, true)
    renderGuard()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders protected content for an authenticated session', () => {
    useAuthStore.setState({
      ...originalState,
      status: 'authenticated',
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'Learner', isEmailVerified: true },
    }, true)
    renderGuard()
    expect(screen.getByText('Private page')).toBeInTheDocument()
  })
})
