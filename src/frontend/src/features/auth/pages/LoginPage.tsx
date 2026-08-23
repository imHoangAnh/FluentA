import { type FormEvent, useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthDivider } from '../components/AuthShell'
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
    <>
      <div className="mb-4 sm:mb-5 xl:mb-6">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-[#2e6a64] sm:text-3xl xl:text-4xl dark:text-teal-400">
          Welcome back
        </h1>
        <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-base">
          Sign in to continue your journey.
        </p>
      </div>
      <form className="grid gap-4 sm:gap-5 xl:gap-6" onSubmit={(event) => void submit(event)}>
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
        <div className="grid gap-2">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
          />
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[#2e6a64] dark:text-teal-400"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="m-0 text-sm font-medium text-primary">{notice}</p> : null}
        <Button className="h-10 w-full rounded-lg bg-[#2e6a64] text-sm font-semibold text-white shadow-sm hover:bg-[#265a55] active:bg-[#1f4844] sm:h-11 sm:text-base xl:h-12 dark:bg-teal-600 dark:hover:bg-teal-700" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</Button>
      </form>

      <AuthDivider />

      <GoogleSignInButton onCredential={acceptGoogleCredential} />

      <div className="mt-4 text-center text-sm text-slate-600 sm:mt-5 sm:text-base xl:mt-6">
        New user?{' '}
        <Link
          to="/register"
          className="font-semibold text-[#2e6a64] dark:text-teal-400"
        >
          Sign up now
        </Link>
      </div>
    </>
  )
}


