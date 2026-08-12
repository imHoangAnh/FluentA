import { type FormEvent, useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthDivider, AuthFormHeader, AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuthStore } from '../store/auth-store'
import { Button } from '@/shared/components/ui/button'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const googleLogin = useAuthStore((state) => state.googleLogin)
  const error = useAuthStore((state) => state.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const notice = typeof location.state === 'object' && location.state && 'notice' in location.state
    ? (location.state as { notice?: string }).notice ?? null
    : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate('/')
    } catch {
      // The auth store owns the account-safe error shown below the fields.
    } finally {
      setIsSubmitting(false)
    }
  }

  const acceptGoogleCredential = useCallback(async (idToken: string) => {
    await googleLogin(idToken)
    navigate('/')
  }, [googleLogin, navigate])

  return (
    <AuthShell mode="login">
      <AuthFormHeader title="Welcome back" description="Sign in to continue your learning." />
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={setPassword}
        />
        {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="m-0 text-sm text-primary">{notice}</p> : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Continue'}</Button>
      </form>

      <AuthDivider />

      <GoogleSignInButton onCredential={acceptGoogleCredential} />

      <div className="mt-6 text-center"><Link to="/forgot-password" className="text-sm font-semibold text-primary no-underline hover:underline">Forgot password?</Link></div>
    </AuthShell>
  )
}

