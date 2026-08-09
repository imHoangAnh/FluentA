import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

test('SPEC core learning loop works in the target browser', async ({ page }) => {
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await loginSeededUser(page, { prefix: 'spec-cross-browser-smoke' })
  await expect(page).toHaveURL(/\/$/)

  await expect(page.locator('#root')).not.toBeEmpty()
  expect(consoleErrors).toEqual([])
})
