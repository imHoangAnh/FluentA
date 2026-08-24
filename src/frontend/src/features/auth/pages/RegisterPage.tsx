import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthDivider } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuthStore } from '../store/auth-store'
import * as authApi from '../api/auth.api'
import type { RegisterPayload } from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'

function secondsUntil(timestamp: string | null) {
  if (!timestamp) return 0
  return Math.max(0, Math.ceil((new Date(timestamp).getTime() - Date.now()) / 1000))
}

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const googleLogin = useAuthStore((state) => state.googleLogin)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otp, setOtp] = useState('')
  const [verification, setVerification] = useState<RegisterPayload | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!verification) return
    const timer = window.setInterval(() => {
      setSecondsRemaining(secondsUntil(verification.resendAvailableAtUtc))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [verification])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      if (verification) {
        await authApi.verifyOtp({ email: verification.email, otp })
        navigate('/login', { state: { notice: 'Email verified. You can log in now.' } })
      } else {
        const payload = await register({ email, password, fullName })
        setVerification(payload)
        setSecondsRemaining(secondsUntil(payload.resendAvailableAtUtc))
        setMessage('We sent a verification code to your inbox.')
      }
    } catch (submissionError) {
      setError(authApiError(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resendCode() {
    if (!verification) return
    setError(null)
    setMessage(null)
    try {
      const payload = await authApi.resendVerificationOtp({ email: verification.email })
      setVerification(payload)
      setSecondsRemaining(secondsUntil(payload.resendAvailableAtUtc))
      setMessage('A new verification code has been sent.')
    } catch (resendError) {
      setError(authApiError(resendError))
    }
  }

  const acceptGoogleCredential = useCallback(async (idToken: string) => {
    await googleLogin(idToken)
    navigate('/')
  }, [googleLogin, navigate])

  return (
    <>
      <div className="mb-4 sm:mb-5 xl:mb-6">
        <h1 className="m-0 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
          Create your account
        </h1>
        <p className="m-0 mt-1 text-xs leading-5 text-muted-foreground sm:mt-1.5 sm:text-sm sm:leading-6">
          Start your journey and build your second brain.
        </p>
      </div>
      <form className="grid gap-3.5 sm:gap-4.5 xl:gap-6" onSubmit={(event) => void submit(event)}>
        <TextField label="Full name" name="fullName" autoComplete="name" placeholder="Enter your full name" value={fullName} onChange={setFullName} disabled={verification !== null} />
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} disabled={verification !== null} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={setPassword}
          disabled={verification !== null}
        />
        {verification ? <TextField label="Verification code" name="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the 6-digit code" value={otp} onChange={setOtp} autoFocus /> : null}
        {message ? <p role="status" className="m-0 text-sm font-medium text-primary">{message}</p> : null}
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        <Button className="h-10 w-full rounded-lg bg-[#2e6a64] text-sm font-semibold text-white shadow-sm hover:bg-[#265a55] active:bg-[#1f4844] sm:h-11 sm:text-base xl:h-12 dark:bg-teal-600 dark:hover:bg-teal-700" type="submit" disabled={isSubmitting}>{isSubmitting ? (verification ? 'Verifying...' : 'Creating account...') : (verification ? 'Verify email' : 'Continue')}</Button>
      </form>

      {verification ? (
        <Button className="mt-2.5 h-10 w-full rounded-lg text-sm sm:mt-3 sm:h-11 sm:text-base xl:h-12" variant="outline" type="button" onClick={() => void resendCode()} disabled={secondsRemaining > 0}>
          {secondsRemaining > 0 ? `Resend code (${secondsRemaining}s)` : 'Resend code'}
        </Button>
      ) : (
        <>
          <AuthDivider />
          <GoogleSignInButton onCredential={acceptGoogleCredential} />
          <div className="mt-4 text-center text-sm text-slate-600 sm:mt-5 sm:text-base xl:mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#2e6a64] dark:text-teal-400"
            >
              Sign in
            </Link>
          </div>
        </>
      )}
    </>
  )
}

function authApiError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? 'Something went wrong.'
  }

  return 'Something went wrong.'
}
