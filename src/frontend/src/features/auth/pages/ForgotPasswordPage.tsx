import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { TextField } from '../components/TextField'
import * as authApi from '../api/auth.api'
import { Button } from '@/shared/components/ui/button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    try {
      const payload = await authApi.forgotPassword({ email })
      setMessage(payload.message)
    } catch (submissionError) {
      setError(authApiError(submissionError))
    }
  }

  return (
    <AuthShell mode="login">
      <div className="grid gap-5">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your account email and we will send a reset link if password recovery is available for that account.
          </p>
        </div>
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={setEmail} />
          {message ? <p role="status" className="m-0 text-sm text-primary">{message}</p> : null}
          {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit">Send reset link</Button>
        </form>
        <div className="flex justify-between text-sm font-semibold"><Link to="/login" className="text-primary no-underline hover:underline">Back to login</Link><Link to="/register" className="text-primary no-underline hover:underline">Register</Link></div>
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
