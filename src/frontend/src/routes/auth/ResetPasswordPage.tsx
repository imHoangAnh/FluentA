import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import * as authApi from '../../lib/api/auth.api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const missingToken = useMemo(() => token.length === 0, [token])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      const payload = await authApi.resetPassword({ token, password, confirmPassword })
      navigate('/login', { state: { notice: payload.message } })
    } catch (submissionError) {
      setError(authApiError(submissionError))
    }
  }

  return (
    <AuthShell mode="login">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Choose a new password</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Set a new password for your FluentA account. This link can only be used once.
          </p>
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(event) => void submit(event)}>
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a new password"
            value={password}
            onChange={setPassword}
          />
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {missingToken ? <p className="form-error">This password reset link is missing its token.</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" style={{ minHeight: '44px', borderRadius: '22px' }} disabled={missingToken}>
            Reset password
          </button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <Link to="/login" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Back to login</Link>
          <Link to="/forgot-password" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Request a new link</Link>
        </div>
      </div>
    </AuthShell>
  )
}

function authApiError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? 'Something went wrong.'
  }

  return 'Something went wrong.'
}
