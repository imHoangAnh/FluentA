import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import * as authApi from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'

type VerifyState = {
  email?: string
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
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      await authApi.verifyOtp({ email, otp })
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
      setVerificationExpiresAtUtc(payload.verificationExpiresAtUtc)
      setResendAvailableAtUtc(payload.resendAvailableAtUtc)
      setSecondsRemaining(secondsUntil(payload.resendAvailableAtUtc))
    } catch (resendError) {
      setError(authApiError(resendError))
    }
  }

  return (
    <AuthShell mode="register">
      <div className="grid gap-5">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter the six-digit code we sent to your email to finish creating your FluentA account.
          </p>
        </div>
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
          <TextField label="Verification code" name="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the 6-digit code" value={otp} onChange={setOtp} />
          {expiryLabel ? <p role="status" className="m-0 text-sm text-primary">Code expires at {expiryLabel}.</p> : null}
          {message ? <p role="status" className="m-0 text-sm text-primary">{message}</p> : null}
          {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit">Verify email</Button>
        </form>
        <Button
          variant="outline"
          type="button"
          onClick={() => void resendCode()}
          disabled={secondsRemaining > 0}
          className="w-full"
        >
          {secondsRemaining > 0 ? `Resend available in ${secondsRemaining}s` : 'Resend code'}
        </Button>
        <div className="flex justify-between text-sm font-semibold"><Link to="/register" className="text-primary no-underline hover:underline">Back to register</Link><Link to="/login" className="text-primary no-underline hover:underline">Go to login</Link></div>
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
