import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthFormHeader, AuthShell } from '../components/AuthShell'
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
    <AuthShell mode="forgot-password">
      <AuthFormHeader title="Reset your password" description="Enter your email address and we’ll send you a password reset link if an eligible FluentA account exists." />
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
        {message ? <div role="status" className="grid gap-1 text-sm text-primary"><strong>Check your inbox</strong><p className="m-0 leading-5">{message}</p></div> : null}
        {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send reset link'}</Button>
      </form>
      <div className="mt-5 text-center text-sm font-semibold"><Link to="/login" className="text-primary no-underline hover:underline">Back to login</Link></div>
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
