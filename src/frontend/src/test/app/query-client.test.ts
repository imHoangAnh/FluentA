import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/shared/api/query-client'

describe('shared QueryClient', () => {
  it('creates an isolated cache for each provider tree', () => {
    const first = createQueryClient()
    const second = createQueryClient()

    first.setQueryData(['identity'], 'first')

    expect(second).not.toBe(first)
    expect(second.getQueryData(['identity'])).toBeUndefined()
  })
})
