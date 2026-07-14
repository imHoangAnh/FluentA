import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, configureAuthTransport } from '@/shared/lib/http/client'

function ok(config: InternalAxiosRequestConfig) {
  return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return Promise.reject(new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config },
  ))
}

afterEach(() => {
  configureAuthTransport({
    getAccessToken: () => null,
    setAccessToken: () => undefined,
    refreshAccess: async () => null,
  })
})

describe('authenticated HTTP transport', () => {
  it('injects the in-memory access token', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) => ok(config))
    configureAuthTransport({
      getAccessToken: () => 'memory-token',
      setAccessToken: () => undefined,
      refreshAccess: async () => null,
    })

    await apiClient.get('/resource', { adapter })

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer memory-token')
  })

  it('refreshes once after a 401 and retries with the new token', async () => {
    const refreshAccess = vi.fn(async () => 'refreshed-token')
    let attempts = 0
    const adapter = vi.fn<AxiosAdapter>((config) => {
      attempts += 1
      return attempts === 1 ? unauthorized(config) : ok(config)
    })
    configureAuthTransport({
      getAccessToken: () => 'expired-token',
      setAccessToken: () => undefined,
      refreshAccess,
    })

    await apiClient.get('/resource', { adapter })

    expect(refreshAccess).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer refreshed-token')
  })

  it('clears the token and rejects when refresh fails', async () => {
    const setAccessToken = vi.fn()
    const adapter: AxiosAdapter = (config) => unauthorized(config)
    configureAuthTransport({
      getAccessToken: () => 'expired-token',
      setAccessToken,
      refreshAccess: async () => null,
    })

    await expect(apiClient.get('/resource', { adapter })).rejects.toMatchObject({ response: { status: 401 } })
    expect(setAccessToken).toHaveBeenCalledWith(null)
  })

  it.each(['/auth/login', '/auth/register', '/auth/refresh'])(
    'does not recursively refresh %s',
    async (url) => {
      const refreshAccess = vi.fn(async () => 'unexpected-token')
      const adapter: AxiosAdapter = (config) => unauthorized(config)
      configureAuthTransport({
        getAccessToken: () => null,
        setAccessToken: () => undefined,
        refreshAccess,
      })

      await expect(apiClient.post(url, {}, { adapter })).rejects.toMatchObject({ response: { status: 401 } })
      expect(refreshAccess).not.toHaveBeenCalled()
    },
  )
})
