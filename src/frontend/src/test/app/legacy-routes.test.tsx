import { describe, expect, it } from 'vitest'
import { legacyProtectedRoutes } from '@/app/legacy-routes'

describe('temporary legacy route manifest', () => {
  it('contains only the approved unmigrated E30 routes', () => {
    const paths = legacyProtectedRoutes.map((route) => route.index ? '<index>' : route.path)
    expect(paths).toEqual([
    ])
  })
})
