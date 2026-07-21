import { describe, expect, it } from 'vitest'
import { safeNotificationActionPath } from './notification.api'

describe('safeNotificationActionPath', () => {
  it('accepts an application-relative path', () => {
    expect(safeNotificationActionPath('/todo?taskId=owned')).toBe('/todo?taskId=owned')
  })

  it.each([
    'https://example.com/todo',
    '//example.com/todo',
    '/todo\\evil',
    '/todo\nnext',
    '',
  ])('rejects unsafe navigation value %s', (value) => {
    expect(safeNotificationActionPath(value)).toBeNull()
  })
})
