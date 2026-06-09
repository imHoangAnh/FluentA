import { KeyRound, LogIn } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import { buildGoogleAuthUrl } from '../../lib/auth/google'
import { useAuthStore } from '../../stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const error = useAuthStore((state) => state.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stubMessage, setStubMessage] = useState<string | null>(null)

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
    <AuthShell>
      <div className="form-copy">
        <h2>Login</h2>
        <p>Continue your vocabulary and review rhythm from a protected workspace.</p>
      </div>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        {error ? <p className="form-error">{error}</p> : null}
        {stubMessage ? <p className="form-note">{stubMessage}</p> : null}
        <button className="primary-button" type="submit">
          <LogIn size={18} /> Continue
        </button>
      </form>

      <button className="ghost-button" type="button" onClick={startGoogleLogin}>
        <KeyRound size={18} /> Continue with Google
      </button>
      <p className="switch-copy">
        New to FluentA? <Link to="/register">Create account</Link>
      </p>
    </AuthShell>
  )
}
