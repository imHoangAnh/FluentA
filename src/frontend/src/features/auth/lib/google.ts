const googleAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth'

export function googleRedirectUri() {
  const runtimeRedirect = `${window.location.origin}/auth/google/callback`
  const configuredRedirect = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string | undefined

  if (!configuredRedirect) {
    return runtimeRedirect
  }

  try {
    const configuredUrl = new URL(configuredRedirect)
    const runtimeUrl = new URL(runtimeRedirect)

    if (configuredUrl.origin !== runtimeUrl.origin) {
      return runtimeRedirect
    }

    return configuredUrl.toString()
  } catch {
    return runtimeRedirect
  }
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
