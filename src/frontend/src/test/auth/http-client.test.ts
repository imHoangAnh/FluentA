import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/lib/http/client'

function ok(config: InternalAxiosRequestConfig) {
  return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
}

describe('cookie-only HTTP transport', () => {
  it('sends credentials without adding an Authorization header', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) => ok(config))
    await apiClient.get('/resource', { adapter })
    const config = adapter.mock.calls[0][0]
    expect(config.withCredentials).toBe(true)
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('does not retry a 401 through a removed refresh-token flow', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw Object.assign(new Error('Unauthorized'), { response: { status: 401 }, config })
    })
    await expect(apiClient.get('/resource', { adapter })).rejects.toBeTruthy()
    expect(adapter).toHaveBeenCalledTimes(1)
  })
})
