import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getAuthApiError } from './auth.api'

describe('getAuthApiError', () => {
  it('reads the shared response message and retry header', () => {
    const error = new AxiosError('Too many requests')
    error.response = {
      data: {
        success: false,
        message: 'Too many requests. Please try again later.',
        data: null,
        errors: [{ code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }],
        traceId: 'test-trace',
      },
      status: 429,
      statusText: 'Too Many Requests',
      headers: new AxiosHeaders({ 'retry-after': '12' }),
      config: { headers: new AxiosHeaders() },
    }

    expect(getAuthApiError(error)).toEqual({
      message: 'Too many requests. Please try again later. Please try again in 12 seconds.',
      retryAfterSeconds: 12,
    })
  })
})
