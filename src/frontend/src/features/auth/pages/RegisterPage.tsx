import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthDivider, AuthFormHeader, AuthShell } from '../components/AuthShell'
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
    <AuthShell mode="register">
      <AuthFormHeader
        title="Create your account"
        description={verification ? 'Enter the verification code to finish creating your account.' : 'Start building a vocabulary you will remember.'}
      />
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
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
        {message ? <p role="status" className="m-0 text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? (verification ? 'Verifying...' : 'Creating account...') : (verification ? 'Verify email' : 'Continue')}</Button>
      </form>

      {verification ? (
        <Button className="mt-4 w-full" variant="outline" type="button" onClick={() => void resendCode()} disabled={secondsRemaining > 0}>
          {secondsRemaining > 0 ? `Resend available in ${secondsRemaining}s` : 'Resend code'}
        </Button>
      ) : (
        <>
          <AuthDivider />
          <GoogleSignInButton onCredential={acceptGoogleCredential} />
        </>
      )}
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
