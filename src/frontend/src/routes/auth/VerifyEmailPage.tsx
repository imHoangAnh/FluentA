import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import * as authApi from '../../lib/api/auth.api'

type VerifyState = {
  email?: string
  developmentOtp?: string | null
  resendAvailableAtUtc?: string
  verificationExpiresAtUtc?: string
}

function secondsUntil(timestamp: string | null) {
  if (!timestamp) {
    return 0
  }

  return Math.max(0, Math.ceil((new Date(timestamp).getTime() - Date.now()) / 1000))
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state ?? {}) as VerifyState
  const initialEmail = state.email ?? searchParams.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState(state.developmentOtp ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(state.developmentOtp ?? null)
  const [resendAvailableAtUtc, setResendAvailableAtUtc] = useState<string | null>(state.resendAvailableAtUtc ?? null)
  const [verificationExpiresAtUtc, setVerificationExpiresAtUtc] = useState<string | null>(state.verificationExpiresAtUtc ?? null)
  const [secondsRemaining, setSecondsRemaining] = useState(() => secondsUntil(state.resendAvailableAtUtc ?? null))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining(secondsUntil(resendAvailableAtUtc))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendAvailableAtUtc])

  const expiryLabel = useMemo(() => {
    if (!verificationExpiresAtUtc) {
      return null
    }

    return new Date(verificationExpiresAtUtc).toLocaleString()
  }, [verificationExpiresAtUtc])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    try {
      await authApi.verifyEmail({ email, otp })
      navigate('/login', {
        state: { notice: 'Email verified. You can log in now.' },
      })
    } catch (submissionError) {
      setError(authApiError(submissionError))
    }
  }

  async function resendCode() {
    setError(null)
    setMessage(null)

    try {
      const payload = await authApi.resendVerificationOtp({ email })
      setMessage(payload.message)
      setDevelopmentOtp(payload.developmentOtp ?? null)
      setVerificationExpiresAtUtc(payload.verificationExpiresAtUtc)
      setResendAvailableAtUtc(payload.resendAvailableAtUtc)
      setSecondsRemaining(secondsUntil(payload.resendAvailableAtUtc))
      if (payload.developmentOtp) {
        setOtp(payload.developmentOtp)
      }
    } catch (resendError) {
      setError(authApiError(resendError))
    }
  }

  return (
    <AuthShell mode="register">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Verify your email</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Enter the six-digit code we sent to your email to finish creating your FluentA account.
          </p>
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(event) => void submit(event)}>
          <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
          <TextField label="Verification code" name="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the 6-digit code" value={otp} onChange={setOtp} />
          {expiryLabel ? <p className="form-note" style={{ margin: 0 }}>Code expires at {expiryLabel}.</p> : null}
          {developmentOtp ? <p className="form-note" style={{ margin: 0 }}>Local development code: <strong>{developmentOtp}</strong></p> : null}
          {message ? <p className="form-note" style={{ margin: 0 }}>{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" style={{ minHeight: '44px', borderRadius: '22px' }}>
            Verify email
          </button>
        </form>
        <button
          type="button"
          onClick={() => void resendCode()}
          disabled={secondsRemaining > 0}
          style={{
            width: '100%',
            minHeight: '44px',
            borderRadius: '22px',
            border: '1px solid #cbd5e1',
            backgroundColor: secondsRemaining > 0 ? '#f8fafc' : '#ffffff',
            color: '#0f766e',
            fontWeight: 600,
            cursor: secondsRemaining > 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {secondsRemaining > 0 ? `Resend available in ${secondsRemaining}s` : 'Resend code'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <Link to="/register" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Back to register</Link>
          <Link to="/login" style={{ color: '#0f9f8f', textDecoration: 'none', fontWeight: 600 }}>Go to login</Link>
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
