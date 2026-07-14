import { create } from 'zustand'
import { configureAuthTransport } from '@/shared/lib/http/client'
import * as authApi from '../api/auth.api'
import type { RegisterPayload, UserProfile } from '../api/auth.api'

type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'anonymous'

type AuthState = {
  accessToken: string | null
  user: UserProfile | null
  status: AuthStatus
  error: string | null
  setAccessToken: (token: string | null) => void
  setUser: (user: UserProfile | null) => void
  register: (input: { email: string; password: string; fullName: string }) => Promise<RegisterPayload>
  login: (input: { email: string; password: string }) => Promise<void>
  googleLogin: (input: { code: string; redirectUri: string }) => Promise<void>
  refresh: () => Promise<string | null>
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

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  error: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  register: async (input) => {
    set({ error: null })
    return authApi.registerAccount(input)
  },
  login: async (input) => {
    set({ status: 'checking', error: null })
    try {
      const payload = await authApi.login(input)
      set({ accessToken: payload.accessToken, user: payload.user, status: 'authenticated' })
    } catch (error) {
      set({ accessToken: null, user: null, status: 'anonymous', error: authErrorMessage(error) })
      throw error
    }
  },
  googleLogin: async (input) => {
    set({ status: 'checking', error: null })
    try {
      const payload = await authApi.googleLogin(input)
      set({ accessToken: payload.accessToken, user: payload.user, status: 'authenticated' })
    } catch (error) {
      set({ accessToken: null, user: null, status: 'anonymous', error: authErrorMessage(error) })
      throw error
    }
  },
  refresh: async () => {
    try {
      const payload = await authApi.refresh()
      set({ accessToken: payload.accessToken, user: payload.user, status: 'authenticated' })
      return payload.accessToken
    } catch {
      set({ accessToken: null, user: null, status: 'anonymous' })
      return null
    }
  },
  loadMe: async () => {
    set({ status: 'checking' })
    if (!get().accessToken) {
      const token = await get().refresh()
      if (!token) return
    }

    try {
      const user = await authApi.me()
      set({ user, status: 'authenticated' })
    } catch {
      set({ accessToken: null, user: null, status: 'anonymous' })
    }
  },
  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      set({ accessToken: null, user: null, status: 'anonymous' })
    }
  },
}))

configureAuthTransport({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
  refreshAccess: () => useAuthStore.getState().refresh(),
})
