import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import * as authApi from '../../lib/api/auth.api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [developmentResetUrl, setDevelopmentResetUrl] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setDevelopmentResetUrl(null)

    try {
      const payload = await authApi.forgotPassword({ email })
      setMessage(payload.message)
      setDevelopmentResetUrl(payload.developmentResetUrl ?? null)
    } catch (submissionError) {
      setError(authApiError(submissionError))
    }
  }

  return (
    <AuthShell mode="login">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Reset your password</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Enter your account email and we will send a reset link if password recovery is available for that account.
          </p>
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(event) => void submit(event)}>
          <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
          {message ? <p className="form-note" style={{ margin: 0 }}>{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {developmentResetUrl ? (
            <p className="form-note" style={{ margin: 0 }}>
              Local reset link: <a href={developmentResetUrl}>{developmentResetUrl}</a>
            </p>
          ) : null}
          <button className="primary-button" type="submit" style={{ minHeight: '44px', borderRadius: '22px' }}>
            Send reset link
          </button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <Link to="/login" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Back to login</Link>
          <Link to="/register" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
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
