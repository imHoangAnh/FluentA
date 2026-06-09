const googleAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth'

export function googleRedirectUri() {
  return import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/auth/google/callback`
}

export function googleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
}

export function buildGoogleAuthUrl() {
  const clientId = googleClientId()
  if (!clientId) {
    return null
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  })

  return `${googleAuthEndpoint}?${params.toString()}`
}
