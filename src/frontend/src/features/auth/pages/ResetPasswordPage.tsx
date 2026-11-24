import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TextField } from '../components/TextField'
import * as authApi from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'
import { useAuthStore } from '../store/auth-store'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const clearSession = useAuthStore((state) => state.clearSession)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestLink, setShowRequestLink] = useState(false)
  const missingToken = useMemo(() => token.length === 0, [token])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setShowRequestLink(false)

    if (password !== confirmPassword) {
      setError('Password confirmation must match.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = await authApi.resetPassword({ token, newPassword: password })
      clearSession()
      navigate('/', { state: { authMode: 'login', authNotice: payload.message } })
    } catch (submissionError) {
      setError(authApiError(submissionError))
      setShowRequestLink(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-foreground">
          Create a new password
        </h1>
        <p className="m-0 mt-2 text-sm leading-5 text-muted-foreground">
          Enter your new password and confirm it below.
        </p>
      </div>
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter a new password"
          value={password}
          onChange={setPassword}
          minLength={8}
          disabled={isSubmitting}
          className="[&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground"
          inputClassName="!h-11 !rounded-[10px] !border-input !bg-card !pl-3.5 !pr-12 !text-sm !shadow-[var(--ds-shadow-xs)] placeholder:!text-muted-foreground focus-visible:!border-primary focus-visible:!ring-primary/20"
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          minLength={8}
          disabled={isSubmitting}
          className="[&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground"
          inputClassName="!h-11 !rounded-[10px] !border-input !bg-card !pl-3.5 !pr-12 !text-sm !shadow-[var(--ds-shadow-xs)] placeholder:!text-muted-foreground focus-visible:!border-primary focus-visible:!ring-primary/20"
        />
        {missingToken ? <p role="alert" className="m-0 text-sm font-medium text-destructive">This password reset link is missing its token.</p> : null}
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        <Button
          className="h-11 w-full rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--ds-shadow-xs)] transition-colors hover:bg-[#0d5e58] active:bg-[#0b504b]"
          type="submit"
          disabled={missingToken || isSubmitting}
        >
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline">
          Back to login
        </Link>
      </div>
      {missingToken || showRequestLink ? (
        <div className="mt-3 text-center">
          <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:text-[#0d5e58] hover:underline">
            Request a new link
          </Link>
        </div>
      ) : null}
    </>
  )
}

function authApiError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Something went wrong.'
  }

  return 'Something went wrong.'
}
