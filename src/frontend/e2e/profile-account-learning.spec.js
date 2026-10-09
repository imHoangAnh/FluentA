import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'profile-account-learning' });
  return identity;
}

test('Profile remains available without requiring local object-storage upload', async ({ page }) => {
  await registerAndLogin(page)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Profile' }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible()
})

test('Profile persists through the API and remains responsive', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await registerAndLogin(page)
  await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Profile', exact: true }).last()).toBeVisible()
  await page.getByLabel('Full name').fill('Profile Learner Updated')
  await page.getByLabel('About').fill('API-backed profile proof')
  const profilePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/profile') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save profile' }).click()
  expect((await profilePromise).status()).toBe(200)
  await expect(page.getByText('Profile saved.')).toBeVisible()

  await page.screenshot({ path: testInfo.outputPath('profile-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1024, height: 900 })
  const scrollWidth = await page.locator('body').evaluate((body) => body.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(1024)
  await page.screenshot({ path: testInfo.outputPath('profile-tablet.png'), fullPage: true })
})
