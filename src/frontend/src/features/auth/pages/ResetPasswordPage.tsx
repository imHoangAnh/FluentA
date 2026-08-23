import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
    <>
      <div className="mb-4 sm:mb-5 xl:mb-6">
        <h1 className="m-0 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
          Choose a new password
        </h1>
        <p className="m-0 mt-1 text-xs leading-5 text-muted-foreground sm:mt-1.5 sm:text-sm sm:leading-6">
          Set a new password for your FluentA account. This link can only be used once.
        </p>
      </div>
      <form className="grid gap-4 sm:gap-5 xl:gap-6" onSubmit={(event) => void submit(event)}>
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
        {missingToken ? <p role="alert" className="m-0 text-sm font-medium text-destructive">This password reset link is missing its token.</p> : null}
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        <Button
          className="h-10 w-full rounded-lg bg-[#2e6a64] text-sm font-semibold text-white shadow-sm hover:bg-[#265a55] active:bg-[#1f4844] sm:h-11 sm:text-base xl:h-12 dark:bg-teal-600 dark:hover:bg-teal-700"
          type="submit"
          disabled={missingToken}
        >
          Reset password
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm sm:mt-5 sm:text-base xl:mt-6">
        <Link to="/login" className="font-semibold text-[#2e6a64] dark:text-teal-400">
          Back to login
        </Link>
        <Link to="/forgot-password" className="font-semibold text-[#2e6a64] dark:text-teal-400">
          Request a new link
        </Link>
      </div>
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
