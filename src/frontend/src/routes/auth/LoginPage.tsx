import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import { buildGoogleAuthUrl } from '../../lib/auth/google'
import { useAuthStore } from '../../stores/authStore'

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
      <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(event) => void submit(event)}>
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
        {error ? <p className="form-error">{error}</p> : null}
        {notice ? <p className="form-note">{notice}</p> : null}
        {stubMessage ? <p className="form-note">{stubMessage}</p> : null}
        <button className="primary-button" type="submit" style={{ marginTop: '8px', minHeight: '44px', borderRadius: '22px' }}>
          Continue
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: '#a7b5b2', fontSize: '14px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2ecea' }}></div>
        <span style={{ padding: '0 12px' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2ecea' }}></div>
      </div>

      <button
        type="button"
        onClick={startGoogleLogin}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', borderRadius: '22px', border: '1px solid #e2ecea', backgroundColor: '#fff', color: '#1a2e2a', fontWeight: 600, cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/forgot-password" style={{ color: '#0f9f8f', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
      </div>
    </AuthShell>
  )
}

