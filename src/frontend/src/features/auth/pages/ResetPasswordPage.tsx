import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import * as authApi from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const missingToken = useMemo(() => token.length === 0, [token])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      if (password !== confirmPassword) {
        setError('Password confirmation must match.')
        return
      }
      const payload = await authApi.resetPassword({ token, newPassword: password })
      navigate('/login', { state: { notice: payload.message } })
    } catch (submissionError) {
      setError(authApiError(submissionError))
    }
  }

  return (
    <AuthShell mode="login">
      <div className="grid gap-5">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set a new password for your FluentA account. This link can only be used once.
          </p>
        </div>
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a new password"
            value={password}
            onChange={setPassword}
          />
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {missingToken ? <p role="alert" className="m-0 text-sm text-destructive">This password reset link is missing its token.</p> : null}
          {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={missingToken}>Reset password</Button>
        </form>
        <div className="flex justify-between text-sm font-semibold"><Link to="/login" className="text-primary no-underline hover:underline">Back to login</Link><Link to="/forgot-password" className="text-primary no-underline hover:underline">Request a new link</Link></div>
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
