import { type FormEvent, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuthStore } from '../store/auth-store'
import { Button } from '@/shared/components/ui/button'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const googleLogin = useAuthStore((state) => state.googleLogin)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const payload = await register({ email, password, fullName })
      setMessage(payload.message)
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`, {
        state: {
          email: payload.email,
          resendAvailableAtUtc: payload.resendAvailableAtUtc,
          verificationExpiresAtUtc: payload.verificationExpiresAtUtc,
        },
      })
    } catch (submissionError) {
      setError(authApiError(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const acceptGoogleCredential = useCallback(async (idToken: string) => {
    await googleLogin(idToken)
    navigate('/')
  }, [googleLogin, navigate])

  return (
    <AuthShell mode="register">
      <div className="mb-7"><h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-foreground">Create your account</h1><p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">Start building a vocabulary you will remember.</p></div>
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <TextField label="Full name" name="fullName" autoComplete="name" placeholder="Enter your full name" value={fullName} onChange={setFullName} />
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={setPassword}
        />
        {message ? <p role="status" className="m-0 text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Continue'}</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

      <GoogleSignInButton onCredential={acceptGoogleCredential} />
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
