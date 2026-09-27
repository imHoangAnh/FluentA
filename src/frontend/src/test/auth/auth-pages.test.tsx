import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from '@/features/auth'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'

describe('password reset page', () => {
  it('uses the standalone banner layout', () => {
    const router = createMemoryRouter(
      [{
        element: <AuthLayout />,
        children: [{ path: '/reset-password', element: <ResetPasswordPage /> }],
      }],
      { initialEntries: ['/reset-password?token=reset-token'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('main')).toHaveClass('ds-root')
    expect(screen.queryByLabelText('Authentication context')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Authentication' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
  })
})
