import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/shared/api/query-client'
import * as authApi from '../api/auth.api'
import { useAuthStore } from './auth-store'
import type { AuthUser } from '../api/auth.api'

const initialState = useAuthStore.getState()

afterEach(() => {
  vi.restoreAllMocks()
  queryClient.clear()
  useAuthStore.setState(initialState, true)
})

describe('loadMe', () => {
  it('keeps queries started after the first of two concurrent session checks', async () => {
    const user: AuthUser = { id: 'learner-1', fullName: 'Learner', avatarUrl: null }
    let resolveFirst!: (user: AuthUser) => void
    let resolveSecond!: (user: AuthUser) => void
    const firstResponse = new Promise<AuthUser>((resolve) => { resolveFirst = resolve })
    const secondResponse = new Promise<AuthUser>((resolve) => { resolveSecond = resolve })
    vi.spyOn(authApi, 'me')
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => secondResponse)
    useAuthStore.setState({ user: null, status: 'idle' })

    const firstCheck = useAuthStore.getState().loadMe()
    const secondCheck = useAuthStore.getState().loadMe()
    resolveFirst(user)
    await firstCheck
    queryClient.setQueryData(['countdown', 'events'], ['loaded countdown'])
    resolveSecond(user)
    await secondCheck

    expect(queryClient.getQueryData(['countdown', 'events'])).toEqual(['loaded countdown'])
    expect(useAuthStore.getState().user).toEqual(user)
  })
})
