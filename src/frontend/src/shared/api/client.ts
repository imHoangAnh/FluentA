import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'https://localhost:7000/api/v1'

export const apiClient = axios.create({ baseURL, withCredentials: true })

const refreshClient = axios.create({ baseURL, withCredentials: true })

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _authRetried?: boolean
  _authGeneration?: number
}
type AuthErrorEnvelope = { error?: { code?: string } }
type AuthSessionMessage = { type: 'session-invalidated'; epoch: string } | { type: 'session-established' }

const logoutMarkerKey = 'fluenta.auth.logout-epoch'
const eligibleAccessErrors = new Set(['ACCESS_TOKEN_EXPIRED', 'AUTHENTICATION_REQUIRED'])
const authEndpointsWithoutRefresh = [
  '/auth/login',
  '/auth/google',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-verification-otp',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]

let refreshPromise: { generation: number; promise: Promise<void> } | null = null
let logoutPromise: Promise<void> | null = null
let sessionGeneration = 0
let authSessionInvalidated: () => void = () => undefined
let coordinationReady = false
let authChannel: BroadcastChannel | null = null
let localLogoutEpoch: string | null = null

export function registerAuthSessionInvalidationHandler(handler: () => void) {
  authSessionInvalidated = handler
}

function readErrorCode(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined
  return (error.response?.data as AuthErrorEnvelope | undefined)?.error?.code
}

function isLogoutMarked() {
  if (localLogoutEpoch !== null) return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(logoutMarkerKey) !== null
  } catch {
    return false
  }
}

function clearPrivateDataAndNotify() {
  authSessionInvalidated()
}

function markInvalidated(epoch: string, broadcast: boolean) {
  if (localLogoutEpoch === epoch) return
  localLogoutEpoch = epoch
  sessionGeneration += 1
  try {
    window.localStorage.setItem(logoutMarkerKey, epoch)
  } catch {
    // The in-memory guard still protects this tab when storage is unavailable.
  }
  clearPrivateDataAndNotify()
  if (broadcast) authChannel?.postMessage({ type: 'session-invalidated', epoch } satisfies AuthSessionMessage)
}

function initializeCrossTabCoordination() {
  if (coordinationReady || typeof window === 'undefined') return
  coordinationReady = true

  if (typeof BroadcastChannel !== 'undefined') {
    authChannel = new BroadcastChannel('fluenta-auth')
    authChannel.addEventListener('message', (event: MessageEvent<AuthSessionMessage>) => {
      if (event.data?.type === 'session-invalidated') markInvalidated(event.data.epoch, false)
      if (event.data?.type === 'session-established') localLogoutEpoch = null
    })
  }

  window.addEventListener('storage', (event) => {
    if (event.key === logoutMarkerKey && event.newValue) markInvalidated(event.newValue, false)
    if (event.key === logoutMarkerKey && event.newValue === null) localLogoutEpoch = null
  })
}

export function hasAuthLogoutMarker() {
  initializeCrossTabCoordination()
  return isLogoutMarked()
}

export function markAuthSessionEstablished() {
  initializeCrossTabCoordination()
  sessionGeneration += 1
  localLogoutEpoch = null
  try {
    window.localStorage.removeItem(logoutMarkerKey)
  } catch {
    // A successful login still updates in-memory auth state if storage is unavailable.
  }
  authChannel?.postMessage({ type: 'session-established' } satisfies AuthSessionMessage)
}

export function getAuthSessionGeneration() {
  initializeCrossTabCoordination()
  return sessionGeneration
}

export function isAuthSessionGenerationCurrent(generation: number) {
  initializeCrossTabCoordination()
  return generation === sessionGeneration && !isLogoutMarked()
}

export function isAuthSessionGenerationUnchanged(generation: number) {
  initializeCrossTabCoordination()
  return generation === sessionGeneration
}

export function invalidateAuthSession() {
  initializeCrossTabCoordination()
  markInvalidated(`${Date.now()}-${sessionGeneration + 1}`, true)
}

function shouldSkipRefresh(config: AuthRequestConfig) {
  const url = config.url ?? ''
  return config._authRetried === true || authEndpointsWithoutRefresh.some((path) => url.includes(path))
}

function isEligibleAccessFailure(error: AxiosError) {
  return error.response?.status === 401 && eligibleAccessErrors.has(readErrorCode(error) ?? '')
}

function refreshAccessCookie(expectedGeneration: number): Promise<void> {
  if (refreshPromise) {
    if (refreshPromise.generation === expectedGeneration) return refreshPromise.promise
    return refreshPromise.promise.catch(() => undefined).then(() => {
      if (expectedGeneration !== sessionGeneration || isLogoutMarked()) {
        throw new Error('Authentication changed while another request was being refreshed.')
      }
      return refreshAccessCookie(expectedGeneration)
    })
  }
  if (isLogoutMarked()) return Promise.reject(new Error('Authentication was explicitly signed out.'))

  const refreshOperation = refreshClient.post('/auth/refresh', undefined)
    .then(() => {
      if (sessionGeneration !== expectedGeneration || isLogoutMarked()) {
        throw new Error('Authentication changed while the request was being refreshed.')
      }
    })
    .catch((error: unknown) => {
      if (readErrorCode(error) === 'REFRESH_TOKEN_INVALID' && sessionGeneration === expectedGeneration) {
        invalidateAuthSession()
      }
      throw error
    })
    .finally(() => {
      if (refreshPromise?.promise === refreshOperation) refreshPromise = null
    })

  refreshPromise = { generation: expectedGeneration, promise: refreshOperation }
  return refreshOperation
}

apiClient.interceptors.request.use((config) => {
  const authConfig = config as AuthRequestConfig
  if (authConfig._authGeneration === undefined) authConfig._authGeneration = sessionGeneration
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as AuthRequestConfig
    const isPublicAuthRequest = authEndpointsWithoutRefresh.some((path) => (config.url ?? '').includes(path))
    if (!isPublicAuthRequest && (config._authGeneration !== sessionGeneration || isLogoutMarked())) {
      throw new axios.CanceledError('Authentication changed before the response arrived.')
    }
    return response
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as AuthRequestConfig
    const requestGeneration = originalRequest._authGeneration ?? sessionGeneration
    if (requestGeneration !== sessionGeneration || isLogoutMarked()) return Promise.reject(error)

    if (error.response?.status === 401 && readErrorCode(error) === 'ACCESS_TOKEN_INVALID') {
      invalidateAuthSession()
      return Promise.reject(error)
    }

    if (!isEligibleAccessFailure(error)) return Promise.reject(error)
    if (shouldSkipRefresh(originalRequest)) return Promise.reject(error)

    try {
      await refreshAccessCookie(requestGeneration)
      if (requestGeneration !== sessionGeneration || isLogoutMarked()) return Promise.reject(error)
      originalRequest._authRetried = true
      return apiClient(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

export function logoutCurrentSession(): Promise<void> {
  if (logoutPromise) return logoutPromise
  initializeCrossTabCoordination()
  invalidateAuthSession()

  // Let this tab's refresh response finish before logout clears the cookie, so a
  // late Set-Cookie from that refresh cannot undo the logout in this tab.
  const pendingRefresh = refreshPromise?.promise
  const operation = (async () => {
    if (pendingRefresh) await pendingRefresh.catch(() => undefined)
    await refreshClient.post('/auth/logout', undefined)
  })().finally(() => {
    if (logoutPromise === operation) logoutPromise = null
  })
  logoutPromise = operation
  return operation
}

export async function waitForPendingAuthMutation() {
  // Explicit login must be the last cookie writer in this tab. A failed logout
  // remains visible through its retry toast, but does not prevent a new login.
  if (logoutPromise) await logoutPromise.catch(() => undefined)
  if (refreshPromise) await refreshPromise.promise.catch(() => undefined)
}

export async function ensureRealtimeAuthIsFresh() {
  if (hasAuthLogoutMarker()) throw new Error('Authentication was explicitly signed out.')
  await apiClient.get('/auth/me')
}
