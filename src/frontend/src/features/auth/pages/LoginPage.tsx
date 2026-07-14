import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { buildGoogleAuthUrl } from '../lib/google'
import { useAuthStore } from '../store/auth-store'
import { Button } from '@/shared/components/ui/button'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const error = useAuthStore((state) => state.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stubMessage, setStubMessage] = useState<string | null>(null)
  const notice = typeof location.state === 'object' && location.state && 'notice' in location.state
    ? (location.state as { notice?: string }).notice ?? null
    : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    await login({ email, password })
    navigate('/')
  }

  function startGoogleLogin() {
    const authUrl = buildGoogleAuthUrl()
    if (!authUrl) {
      setStubMessage('Google sign-in is not configured locally.')
      return
    }

    window.location.assign(authUrl)
  }

  return (
    <AuthShell mode="login">
      <div className="mb-7"><h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-foreground">Welcome back</h1><p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">Sign in to continue your learning.</p></div>
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
        {stubMessage ? <p role="status" className="m-0 text-sm text-primary">{stubMessage}</p> : null}
        <Button className="w-full" type="submit">Continue</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

      <button
        type="button"
        onClick={startGoogleLogin}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-card text-sm font-semibold text-foreground hover:bg-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="mt-6 text-center"><Link to="/forgot-password" className="text-sm font-semibold text-primary no-underline hover:underline">Forgot password?</Link></div>
    </AuthShell>
  )
}

