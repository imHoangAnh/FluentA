import { toast } from 'sonner'
import { create } from 'zustand'
import axios from 'axios'
import { queryClient } from '@/app/query-client'
import {
  getAuthSessionGeneration,
  hasAuthLogoutMarker,
  invalidateAuthSession,
  isAuthSessionGenerationCurrent,
  isAuthSessionGenerationUnchanged,
  markAuthSessionEstablished,
  registerAuthSessionInvalidationHandler,
  waitForPendingAuthMutation,
} from '@/shared/api/client'
import * as authApi from '../api/auth.api'
import type { AuthUser, RegisterPayload } from '../api/auth.api'

type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'anonymous'

type AuthState = {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  setUser: (user: AuthUser | null) => void
  clearSession: () => void
  register: (input: { email: string; password: string; fullName: string }) => Promise<RegisterPayload>
  login: (input: { email: string; password: string }) => Promise<authApi.AuthenticationResult>
  googleLogin: (idToken: string) => Promise<authApi.AuthenticationResult>
  loadMe: () => Promise<void>
  logout: () => Promise<void>
}

function authErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? 'Authentication failed.'
  }
  return 'Authentication failed.'
}

function storeAuthenticatedUser(user: AuthUser) {
  const previousUser = useAuthStore.getState().user
  if (previousUser?.id !== user.id) queryClient.clear()
  markAuthSessionEstablished()
  useAuthStore.setState({ user, status: 'authenticated', error: null })
}

function isDefinitiveAuthenticationFailure(error: unknown) {
  if (!axios.isAxiosError(error)) return false
  if (error.response?.status === 401) return true
  return (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code === 'REFRESH_TOKEN_INVALID'
}

function showLogoutRetry() {
  toast.error('Logout could not be confirmed.', {
    description: 'You are signed out in this browser. Retry to confirm that the refresh token was revoked.',
    action: {
      label: 'Retry',
      onClick: () => { void useAuthStore.getState().logout() },
    },
  })
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,
  setUser: (user) => set({ user }),
  clearSession: () => {
    invalidateAuthSession()
    queryClient.clear()
    set({ user: null, status: 'anonymous', error: null })
  },
  register: async (input) => {
    set({ error: null })
    return authApi.registerAccount(input)
  },
  login: async (input) => {
    await waitForPendingAuthMutation()
    const generation = getAuthSessionGeneration()
    set({ status: 'checking', error: null })
    try {
      const result = await authApi.login(input)
      if (!isAuthSessionGenerationUnchanged(generation)) return result
      if (result.nextStep === 'AUTHENTICATED') storeAuthenticatedUser(result.user)
      else set({ user: null, status: 'anonymous', error: null })
      return result
    } catch (error) {
      if (isAuthSessionGenerationUnchanged(generation)) {
        set({ user: null, status: 'anonymous', error: authErrorMessage(error) })
      }
      throw error
    }
  },
  googleLogin: async (idToken) => {
    await waitForPendingAuthMutation()
    const generation = getAuthSessionGeneration()
    set({ status: 'checking', error: null })
    try {
      const result = await authApi.googleLogin({ idToken })
      if (!isAuthSessionGenerationUnchanged(generation)) return result
      if (result.nextStep === 'AUTHENTICATED') storeAuthenticatedUser(result.user)
      else set({ user: null, status: 'anonymous', error: null })
      return result
    } catch (error) {
      if (isAuthSessionGenerationUnchanged(generation)) {
        set({ user: null, status: 'anonymous', error: authErrorMessage(error) })
      }
      throw error
    }
  },
  loadMe: async () => {
    if (hasAuthLogoutMarker()) {
      set({ user: null, status: 'anonymous', error: null })
      return
    }

    const generation = getAuthSessionGeneration()
    const previousUser = useAuthStore.getState().user
    set({ status: 'checking' })
    try {
      const user = await authApi.me()
      if (!isAuthSessionGenerationCurrent(generation)) return
      if (previousUser?.id !== user.id) queryClient.clear()
      set({ user, status: 'authenticated', error: null })
    } catch (error) {
      if (!isAuthSessionGenerationCurrent(generation)) return
      if (isDefinitiveAuthenticationFailure(error)) {
        invalidateAuthSession()
        return
      }
      // Keep an existing principal during network and server failures. On a
      // fresh load there is no authenticated UI to discard, so show the banner.
      const current = useAuthStore.getState().user
      if (current) set({ user: current, status: 'authenticated' })
      else set({ user: null, status: 'anonymous' })
    }
  },
  logout: async () => {
    const logoutRequest = authApi.logout()
    queryClient.clear()
    set({ user: null, status: 'anonymous', error: null })
    try {
      await logoutRequest
    } catch {
      showLogoutRetry()
    }
  },
}))

registerAuthSessionInvalidationHandler(() => {
  queryClient.clear()
  useAuthStore.setState({ user: null, status: 'anonymous', error: null })
})
