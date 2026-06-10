import { KeyRound, UserPlus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/auth/TextField'
import { buildGoogleAuthUrl } from '../../lib/auth/google'
import { useAuthStore } from '../../stores/authStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    await register({ email, password, fullName })
    setMessage('Account created. Check your email to verify before logging in.')
    navigate('/login')
  }

  function startGoogleLogin() {
    const authUrl = buildGoogleAuthUrl()
    if (!authUrl) {
      setMessage('Google sign-in is not configured locally.')
      return
    }

    window.location.assign(authUrl)
  }

  return (
    <AuthShell>
      <div className="form-copy">
        <h2>Create account</h2>
        <p>Start with a secure profile before vocabulary and flashcards arrive.</p>
      </div>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <TextField label="Full name" name="fullName" autoComplete="name" value={fullName} onChange={setFullName} />
        <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        {message ? <p className="form-note">{message}</p> : null}
        <button className="primary-button" type="submit">
          <UserPlus size={18} /> Continue
        </button>
      </form>

      <button className="ghost-button" type="button" onClick={startGoogleLogin}>
        <KeyRound size={18} /> Continue with Google
      </button>
      <p className="switch-copy">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthShell>
  )
}
