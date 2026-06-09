import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { googleRedirectUri } from '../../lib/auth/google'
import { useAuthStore } from '../../stores/authStore'

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
    <AuthShell>
      <div className="form-copy">
        <h2>Google sign-in</h2>
        <p>{authError ?? message}</p>
      </div>
    </AuthShell>
  )
}
