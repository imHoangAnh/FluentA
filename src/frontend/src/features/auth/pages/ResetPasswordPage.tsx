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
        <h1 className="m-0 text-[32px] font-bold leading-[1.2] tracking-[-0.035em] text-[#111827]">
          Create a new password
        </h1>
        <p className="m-0 mt-2 text-sm leading-5 text-[#66747c]">
          Enter your new password and confirm it below.
        </p>
      </div>
      <form className="grid gap-6" onSubmit={(event) => void submit(event)}>
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
          className="[&>label]:text-[14px] [&>label]:leading-5 [&>label]:text-[#111827]"
          inputClassName="!h-[54px] !rounded-2xl !border-[#e2e7eb] !bg-white !pl-4 !pr-12 !text-sm !shadow-none placeholder:!text-[#9ca3af] focus-visible:!border-[#00b8ae] focus-visible:!ring-[#00b8ae]/15"
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
          className="[&>label]:text-[14px] [&>label]:leading-5 [&>label]:text-[#111827]"
          inputClassName="!h-[54px] !rounded-2xl !border-[#e2e7eb] !bg-white !pl-4 !pr-12 !text-sm !shadow-none placeholder:!text-[#9ca3af] focus-visible:!border-[#00b8ae] focus-visible:!ring-[#00b8ae]/15"
        />
        {missingToken ? <p role="alert" className="m-0 text-sm font-medium text-destructive">This password reset link is missing its token.</p> : null}
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        <Button
          className="h-14 w-full rounded-full border border-[#e2e7eb] bg-white text-base font-semibold text-[#18202e] shadow-none transition-colors hover:bg-[#00ada4] hover:text-white active:bg-[#00958e] active:text-white"
          type="submit"
          disabled={missingToken || isSubmitting}
        >
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm font-normal text-[#6b7280] hover:text-[#374151]">
          Back to login
        </Link>
      </div>
      {missingToken || showRequestLink ? (
        <div className="mt-3 text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-[#2e6a64] hover:text-[#245650]">
            Request a new link
          </Link>
        </div>
      ) : null}
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
