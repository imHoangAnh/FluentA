import { toast } from 'sonner'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CircleX, LockKeyhole, Mail } from 'lucide-react'
import logoUrl from '@/shared/assets/fluenta-wordmark.svg'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { getAuthApiError } from '../api/auth.api'
import * as authApi from '../api/auth.api'
import { GoogleSignInButton } from './GoogleSignInButton'
import { OtpCodeInput } from './OtpCodeInput'
import { TextField } from './TextField'
import { useAuthStore } from '../store/auth-store'
import './login-dialog.css'

export type AuthDialogMode = 'login' | 'register'
export type AuthDialogEntryMode = AuthDialogMode | 'forgot-password'
type AuthView = AuthDialogMode | 'verify-email' | 'forgot-password' | 'forgot-sent'
type VerificationSource = 'register' | 'login'
type RegisterDraft = { fullName: string; email: string; password: string }

type AuthDialogProps = {
  open: boolean
  initialMode?: AuthDialogEntryMode
  initialNotice?: string | null
  onOpenChange: (open: boolean) => void
}

const emptyDraft: RegisterDraft = { fullName: '', email: '', password: '' }

export function AuthDialog({ open, initialMode = 'login', initialNotice = null, onOpenChange }: AuthDialogProps) {
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const googleLogin = useAuthStore((state) => state.googleLogin)
  const [view, setView] = useState<AuthView>(initialMode)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginNotice, setLoginNotice] = useState<string | null>(null)
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft>(emptyDraft)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationSource, setVerificationSource] = useState<VerificationSource>('register')
  const [otp, setOtp] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendRetryAt, setResendRetryAt] = useState<number | null>(null)
  const [clock, setClock] = useState(Date.now())
  const operationRef = useRef(0)
  const lastAutoSubmittedCode = useRef<string | null>(null)
  const verificationInFlight = useRef(false)
  const resendSecondsRemaining = resendRetryAt ? Math.max(0, Math.ceil((resendRetryAt - clock) / 1000)) : 0

  useEffect(() => {
    if (open) {
      setView(initialMode)
      setError(null)
      setFeedback(null)
      setLoginNotice(initialNotice)
      setOtp('')
      setResendRetryAt(null)
      lastAutoSubmittedCode.current = null
    } else {
      operationRef.current += 1
      verificationInFlight.current = false
      setView(initialMode)
      setLoginEmail('')
      setLoginPassword('')
      setLoginNotice(null)
      setRegisterDraft(emptyDraft)
      setVerificationEmail('')
      setVerificationSource('register')
      setOtp('')
      setForgotEmail('')
      setError(null)
      setFeedback(null)
      setIsSubmitting(false)
      setResendRetryAt(null)
      lastAutoSubmittedCode.current = null
    }
  }, [initialMode, initialNotice, open])

  useEffect(() => {
    if (!resendRetryAt || resendSecondsRemaining === 0) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendRetryAt, resendSecondsRemaining])

  function clearMessages() {
    setError(null)
    setFeedback(null)
  }

  function changeView(next: AuthView) {
    operationRef.current += 1
    verificationInFlight.current = false
    setIsSubmitting(false)
    clearMessages()
    setView(next)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      operationRef.current += 1
      verificationInFlight.current = false
      setLoginEmail('')
      setLoginPassword('')
      setRegisterDraft(emptyDraft)
      setVerificationEmail('')
      setOtp('')
      setForgotEmail('')
      setError(null)
      setFeedback(null)
      setLoginNotice(null)
      setResendRetryAt(null)
      lastAutoSubmittedCode.current = null
      setView(initialMode)
    }
    onOpenChange(nextOpen)
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault()
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      const result = await login({ email: loginEmail, password: loginPassword })
      if (operation !== operationRef.current) return
      if (result.nextStep === 'AUTHENTICATED') {
        handleOpenChange(false)
      } else {
        setVerificationEmail(result.email)
        setVerificationSource('login')
        setOtp('')
        lastAutoSubmittedCode.current = null
        setLoginNotice(null)
        setView('verify-email')
      }
    } catch (submissionError) {
      if (operation === operationRef.current) setError(getAuthApiError(submissionError, 'Unable to sign in.').message)
    } finally {
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  async function acceptGoogleCredential(idToken: string) {
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      const result = await googleLogin(idToken)
      if (operation !== operationRef.current) return
      if (result.nextStep === 'AUTHENTICATED') {
        handleOpenChange(false)
      } else {
        setVerificationEmail(result.email)
        setVerificationSource('login')
        setOtp('')
        setView('verify-email')
      }
    } catch (googleError) {
      if (operation === operationRef.current) setError(getAuthApiError(googleError, 'Google sign-in failed.').message)
      throw googleError
    } finally {
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  async function submitRegistration(event: FormEvent) {
    event.preventDefault()
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      const payload = await register(registerDraft)
      if (operation !== operationRef.current) return
      setVerificationEmail(payload.email)
      setVerificationSource('register')
      setOtp('')
      lastAutoSubmittedCode.current = null
      setFeedback(null)
      setView('verify-email')
    } catch (submissionError) {
      if (operation === operationRef.current) setError(getAuthApiError(submissionError, 'Unable to create your account.').message)
    } finally {
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  async function verifyCode(code: string, allowRetry = false) {
    if (code.length !== 6 || verificationInFlight.current) return
    if (!allowRetry && lastAutoSubmittedCode.current === code) return
    verificationInFlight.current = true
    lastAutoSubmittedCode.current = code
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      await authApi.verifyOtp({ email: verificationEmail, otp: code })
      if (operation !== operationRef.current) return
      toast.success('Register successfully!')
      handleOpenChange(false)
    } catch (verifyError) {
      if (operation === operationRef.current) setError(getAuthApiError(verifyError, 'Unable to verify this code.').message)
    } finally {
      verificationInFlight.current = false
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  async function resendCode() {
    if (!verificationEmail || resendSecondsRemaining > 0 || isSubmitting) return
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      const payload = await authApi.resendVerificationOtp({ email: verificationEmail })
      if (operation !== operationRef.current) return
      setFeedback(payload.message || 'A new verification code has been sent.')
      setOtp('')
      lastAutoSubmittedCode.current = null
      setResendRetryAt(null)
    } catch (resendError) {
      if (operation === operationRef.current) {
        const result = getAuthApiError(resendError, 'Unable to send a new code.')
        setError(result.message)
        if (result.retryAfterSeconds) setResendRetryAt(Date.now() + result.retryAfterSeconds * 1000)
      }
    } finally {
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  async function submitForgotPassword(event: FormEvent) {
    event.preventDefault()
    clearMessages()
    const operation = operationRef.current
    setIsSubmitting(true)
    try {
      const result = await authApi.forgotPassword({ email: forgotEmail })
      if (operation !== operationRef.current) return
      setFeedback(result.message || 'If your account exists, please check your inbox for a password reset link.')
      setView('forgot-sent')
    } catch (forgotError) {
      if (operation === operationRef.current) setError(getAuthApiError(forgotError, 'Unable to request a reset link.').message)
    } finally {
      if (operation === operationRef.current) setIsSubmitting(false)
    }
  }

  const heading = view === 'login' ? 'Welcome back'
    : view === 'register' ? 'Create your account'
      : view === 'verify-email' ? 'Verify your email'
        : view === 'forgot-password' ? 'Reset your password' : 'Check your inbox'
  function backFromVerification() {
    setOtp('')
    lastAutoSubmittedCode.current = null
    changeView(verificationSource === 'register' ? 'register' : 'login')
  }
  const isVerification = view === 'verify-email'
  const resendClock = String(Math.floor(resendSecondsRemaining / 60)).padStart(2, '0') + ':' + String(resendSecondsRemaining % 60).padStart(2, '0')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`fluenta-login-dialog fluenta-auth-dialog fluenta-auth--${view}`} aria-describedby={undefined}>
        <div className="fluenta-login-brand">
          <>{isVerification ? <button type="button" className="fluenta-otp-back" aria-label={verificationSource === 'register' ? 'Back to registration' : 'Back to login'} disabled={isSubmitting} onClick={backFromVerification}><ArrowLeft size={20} aria-hidden="true" /></button> : <img alt="FluentA" src={logoUrl} />}</>
          <DialogClose asChild>
            <Button className="fluenta-auth-close" variant="ghost" size="icon-sm" type="button" aria-label="Close authentication dialog">
              <CircleX aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <DialogTitle className={isVerification ? 'sr-only' : 'fluenta-auth-title'}>{heading}</DialogTitle>
        {isVerification ? <p className="fluenta-otp-intro">We’ve sent a 6-digit verification code to <span>{verificationEmail}</span>. Please check your inbox.</p> : null}

        {view === 'login' ? (
          <div className="fluenta-login-form">
            <form className="grid gap-4" onSubmit={(event) => void submitLogin(event)}>
              <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={loginEmail} onChange={setLoginEmail} disabled={isSubmitting} leadingIcon={<Mail size={20} aria-hidden="true" />} />
              <div className="grid gap-2">
                <TextField label="Password" name="password" type="password" leadingIcon={<LockKeyhole size={20} aria-hidden="true" />} autoComplete="current-password" placeholder="Enter your password" value={loginPassword} onChange={setLoginPassword} disabled={isSubmitting} />
                <div className="fluenta-login-options">
                  <span />
                  <button type="button" className="fluenta-auth-link" disabled={isSubmitting} onClick={() => { setForgotEmail(loginEmail); changeView('forgot-password') }}>Forgot password?</button>
                </div>
              </div>
              {loginNotice ? <p role="status" className="fluenta-auth-success">{loginNotice}</p> : null}
              {error ? <p role="alert" className="fluenta-auth-error">{error}</p> : null}
              <Button className="fluenta-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</Button>
            </form>
            <div className="fluenta-auth-divider"><span />or<span /></div>
            <GoogleSignInButton onCredential={acceptGoogleCredential} disabled={isSubmitting} />
            <div className="fluenta-auth-switch">
              New user? <button type="button" className="fluenta-auth-link" disabled={isSubmitting} onClick={() => changeView('register')}>Register</button>
            </div>
          </div>
        ) : null}

        {view === 'register' ? (
          <div className="fluenta-login-form">
            <form className="grid gap-4" onSubmit={(event) => void submitRegistration(event)}>
              <TextField label="Full name" name="fullName" autoComplete="name" placeholder="Enter your full name" value={registerDraft.fullName} onChange={(fullName) => setRegisterDraft((draft) => ({ ...draft, fullName }))} disabled={isSubmitting} />
              <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={registerDraft.email} onChange={(email) => setRegisterDraft((draft) => ({ ...draft, email }))} disabled={isSubmitting} />
              <TextField label="Password" name="password" type="password" leadingIcon={<LockKeyhole size={20} aria-hidden="true" />} autoComplete="new-password" placeholder="Create a password" value={registerDraft.password} onChange={(password) => setRegisterDraft((draft) => ({ ...draft, password }))} disabled={isSubmitting} />
              {error ? <p role="alert" className="fluenta-auth-error">{error}</p> : null}
              <Button className="fluenta-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Register'}</Button>
            </form>
            <div className="fluenta-auth-divider"><span />or<span /></div>
            <GoogleSignInButton onCredential={acceptGoogleCredential} disabled={isSubmitting} />
            <div className="fluenta-auth-switch">
              Already have an account? <button type="button" className="fluenta-auth-link" disabled={isSubmitting} onClick={() => changeView('login')}>Login</button>
            </div>
          </div>
        ) : null}

        {view === 'verify-email' ? (
          <div className="fluenta-otp-content">
            <p className="fluenta-otp-label">Enter the 6-digit code:</p>
            {feedback ? <p role="status" className="fluenta-auth-success">{feedback}</p> : null}
            <OtpCodeInput
              value={otp}
              onChange={(next) => {
                setOtp(next)
                if (next !== lastAutoSubmittedCode.current) lastAutoSubmittedCode.current = null
              }}
              onComplete={(code) => { void verifyCode(code) }}
              disabled={isSubmitting}
              autoFocus
              invalid={Boolean(error)}
            />
            {error ? <p role="alert" className="fluenta-auth-error">{error}</p> : null}
            {error && otp.length === 6 ? <Button type="button" variant="outline" className="fluenta-auth-secondary" onClick={() => void verifyCode(otp, true)} disabled={isSubmitting}>Retry verification</Button> : null}
            {isSubmitting ? <p className="fluenta-otp-status" role="status">Please wait…</p> : null}
            <p className="fluenta-otp-resend">Didn’t receive the code? <button type="button" disabled={isSubmitting || resendSecondsRemaining > 0} onClick={() => void resendCode()}>{resendSecondsRemaining > 0 ? 'Resend in (' + resendClock + ')' : 'Resend code'}</button></p>
          </div>
        ) : null}

        {view === 'forgot-password' ? (
          <div className="fluenta-login-form">
            <form className="grid gap-4" onSubmit={(event) => void submitForgotPassword(event)}>
              <TextField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={forgotEmail} onChange={setForgotEmail} disabled={isSubmitting} leadingIcon={<Mail size={20} aria-hidden="true" />} />
              {error ? <p role="alert" className="fluenta-auth-error">{error}</p> : null}
              <Button className="fluenta-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send reset link'}</Button>
            </form>
            <button type="button" className="fluenta-auth-back" disabled={isSubmitting} onClick={() => changeView('login')}>
              Back to login
            </button>
          </div>
        ) : null}

        {view === 'forgot-sent' ? (
          <div className="fluenta-login-form">
            <p role="status" className="fluenta-auth-success">{feedback}</p>
            <button type="button" className="fluenta-auth-back" disabled={isSubmitting} onClick={() => changeView('login')}>
              Back to login
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
