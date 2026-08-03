import { create } from 'zustand'
import * as authApi from '../api/auth.api'
import type { RegisterPayload, UserProfile } from '../api/auth.api'

type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'anonymous'

type AuthState = {
  user: UserProfile | null
  status: AuthStatus
  error: string | null
  setUser: (user: UserProfile | null) => void
  register: (input: { email: string; password: string; fullName: string }) => Promise<RegisterPayload>
  login: (input: { email: string; password: string }) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,
  setUser: (user) => set({ user }),
  register: async (input) => {
    set({ error: null })
    return authApi.registerAccount(input)
  },
  login: async (input) => {
    set({ status: 'checking', error: null })
    try {
      const user = await authApi.login(input)
      set({ user, status: 'authenticated' })
    } catch (error) {
      set({ user: null, status: 'anonymous', error: authErrorMessage(error) })
      throw error
    }
  },
  googleLogin: async (idToken) => {
    set({ status: 'checking', error: null })
    try {
      const user = await authApi.googleLogin({ idToken })
      set({ user, status: 'authenticated' })
    } catch (error) {
      set({ user: null, status: 'anonymous', error: authErrorMessage(error) })
      throw error
    }
  },
  loadMe: async () => {
    set({ status: 'checking' })
    try {
      const user = await authApi.me()
      set({ user, status: 'authenticated' })
    } catch {
      set({ user: null, status: 'anonymous' })
    }
  },
  logout: async () => {
    try { await authApi.logout() }
    finally { set({ user: null, status: 'anonymous' }) }
  },
}))
