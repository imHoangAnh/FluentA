import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { googleRedirectUri } from '../lib/google'
import { useAuthStore } from '../store/auth-store'

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const googleLogin = useAuthStore((state) => state.googleLogin)
  const authError = useAuthStore((state) => state.error)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)
  const code = searchParams.get('code')
  const providerError = searchParams.get('error')
  const message = authError
    ?? failureMessage
    ?? (providerError ? 'Google sign-in was cancelled.' : null)
    ?? (!code ? 'Google sign-in could not complete.' : 'Finishing Google sign-in...')

  useEffect(() => {
    if (providerError || !code) {
      return
    }

    void googleLogin({ code, redirectUri: googleRedirectUri() })
      .then(() => navigate('/', { replace: true }))
      .catch(() => setFailureMessage('Google sign-in could not complete.'))
  }, [code, googleLogin, navigate, providerError])

  return (
    <AuthShell mode="login">
      <div className="grid gap-3">
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Google sign-in</h1>
        <p role={authError || failureMessage || providerError ? 'alert' : 'status'} className="m-0 text-sm leading-6 text-muted-foreground">{authError ?? message}</p>
      </div>
    </AuthShell>
  )
}
