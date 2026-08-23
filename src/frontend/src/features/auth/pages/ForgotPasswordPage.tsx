import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '../components/TextField'
import * as authApi from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    try {
      await authApi.forgotPassword({ email })
      setMessage('If an eligible account exists, we sent a password reset link. Check your Spam or Junk folder if you do not see it.')
    } catch (submissionError) {
      setError(authApiError(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-4 sm:mb-5 xl:mb-6">
        <h1 className="m-0 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
          Reset your password
        </h1>
        <p className="m-0 mt-1 text-xs leading-5 text-muted-foreground sm:mt-1.5 sm:text-sm sm:leading-6">
          Enter your email address and we’ll send you a password reset link.
        </p>
      </div>
      <form className="grid gap-4 sm:gap-5 xl:gap-6" onSubmit={(event) => void submit(event)}>
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
        {message ? (
          <div role="status" className="grid gap-1 rounded-lg border border-teal-100 bg-teal-50/50 p-3.5 text-sm text-[#2e6a64] sm:p-4 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-400">
            <strong className="font-semibold">Check your inbox</strong>
            <p className="m-0 leading-5 text-muted-foreground">{message}</p>
          </div>
        ) : null}
        {error ? <p role="alert" className="m-0 text-sm font-medium text-destructive">{error}</p> : null}
        <Button className="h-10 w-full rounded-lg bg-[#2e6a64] text-sm font-semibold text-white shadow-sm hover:bg-[#265a55] active:bg-[#1f4844] sm:h-11 sm:text-base xl:h-12 dark:bg-teal-600 dark:hover:bg-teal-700" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send reset link'}</Button>
      </form>
      <div className="mt-4 text-center text-sm text-slate-600 sm:mt-5 sm:text-base xl:mt-6">
        <Link to="/login" className="font-semibold text-[#2e6a64] dark:text-teal-400">
          Back to login
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
