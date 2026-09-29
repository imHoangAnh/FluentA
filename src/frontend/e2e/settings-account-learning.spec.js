import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'settings-account-learning' });
  return identity;
}

test('Settings profile surface remains available without requiring local object-storage upload', async ({ page }) => {
  await registerAndLogin(page)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Profile' }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible()
})

test('Settings profile persists through the API and remains responsive', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await registerAndLogin(page)
  await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Profile', exact: true }).last()).toBeVisible()
  await page.getByLabel('Full name').fill('Settings Learner Updated')
  await page.getByLabel('About').fill('API-backed settings proof')
  const profilePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/profile') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save profile' }).click()
  expect((await profilePromise).status()).toBe(200)
  await expect(page.getByText('Profile saved.')).toBeVisible()

  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1024, height: 900 })
  const scrollWidth = await page.locator('body').evaluate((body) => body.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(1024)
  await page.screenshot({ path: testInfo.outputPath('settings-tablet.png'), fullPage: true })
})
