import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '@/features/auth/api/auth.api'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { useAuthStore } from '@/features/auth/store/auth-store'

vi.mock('@/features/auth/api/auth.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api/auth.api')>('@/features/auth/api/auth.api')
  return {
    ...actual,
    registerAccount: vi.fn(),
    verifyOtp: vi.fn(),
    resendVerificationOtp: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  }
})

vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button type="button">Continue with Google</button>,
}))

function renderRoute(element: React.ReactNode, initialEntry: string) {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{element}</MemoryRouter>)
}

describe('approved authentication form refinement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, status: 'anonymous', error: null })
  })

  it('keeps verification inline and locks submitted registration fields', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.registerAccount).mockResolvedValue({
      message: 'Registration successful.',
      email: 'learner@example.com',
      verificationExpiresAtUtc: new Date(Date.now() + 300_000).toISOString(),
      resendAvailableAtUtc: new Date(Date.now() + 30_000).toISOString(),
    })

    renderRoute(<RegisterPage />, '/register')
    await user.type(screen.getByLabelText('Full name'), 'Test Learner')
    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass123')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByLabelText('Verification code')).toHaveFocus()
    expect(screen.getByLabelText('Full name')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reveal characters' })).toBeDisabled()
    expect(screen.getAllByLabelText('Email')).toHaveLength(1)
    expect(screen.queryByText(/Code expires at/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Change details')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled()
  })

  it('uses a dedicated Forgot password context without inventing a countdown', async () => {
    const user = userEvent.setup()
    let resolveForgotPassword!: (value: authApi.ForgotPasswordPayload) => void
    vi.mocked(authApi.forgotPassword).mockReturnValue(new Promise((resolve) => {
      resolveForgotPassword = resolve
    }))

    renderRoute(<ForgotPasswordPage />, '/forgot-password')
    expect(screen.getByLabelText('Authentication context')).toHaveTextContent('Forgot password')
    expect(screen.queryByRole('navigation', { name: 'Authentication' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()
    resolveForgotPassword({ message: 'Generic response.' })
    expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox')
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled()
    expect(screen.queryByText(/Send again in \d+s/i)).not.toBeInTheDocument()
  })

  it('uses a dedicated New password context', () => {
    renderRoute(<ResetPasswordPage />, '/reset-password?token=reset-token')
    expect(screen.getByLabelText('Authentication context')).toHaveTextContent('New password')
    expect(screen.queryByRole('navigation', { name: 'Authentication' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
  })

  it('keeps the standalone verification route reduced to the OTP field', () => {
    renderRoute(<VerifyEmailPage />, '/verify-email?email=learner%40example.com')
    expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText(/Code expires at/i)).not.toBeInTheDocument()
  })
})
