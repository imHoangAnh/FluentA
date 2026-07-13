import { expect, test } from '@playwright/test'

async function registerAndLogin(page) {
  const email = `settings+${crypto.randomUUID()}@example.com`
  const password = 'SecurePass123'
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Settings Learner')
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('Create a password').fill(password)
  const registrationPromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const registration = await (await registrationPromise).json()
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { email, otp: registration.data.developmentOtp } })
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
}

test('Settings profile, Practice, Review, Level 5, and responsive routes persist through the API', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await registerAndLogin(page)
  await page.goto('/settings/profile')

  await expect(page.getByRole('heading', { name: 'Your settings' })).toBeVisible()
  await page.getByLabel('Full name').fill('Settings Learner Updated')
  await page.getByLabel('Bio').fill('API-backed settings proof')
  const profilePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/profile') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save profile' }).click()
  expect((await profilePromise).status()).toBe(200)
  await expect(page.getByText('Profile saved.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name: 'Practice' }).click()
  await expect(page).toHaveURL(/\/settings\/practice$/)
  await page.getByRole('button', { name: /Pronunciation/ }).click()
  const practicePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/practice/settings') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save practice settings' }).click()
  expect((await practicePromise).status()).toBe(200)
  await expect(page.getByText('Practice settings saved.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name: 'Review' }).click()
  const dailyLimit = page.getByLabel('Daily limit')
  await dailyLimit.fill('275')
  const reviewPromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/review/settings') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save review settings' }).click()
  expect((await reviewPromise).status()).toBe(200)
  await expect(page.getByText('Review settings saved.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name: 'Level 5' }).click()
  await expect(page.getByRole('heading', { name: 'Manage Level 5 words' })).toBeVisible()
  await expect(page.getByText('No Level 5 words match this filter yet.')).toBeVisible()

  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1024, height: 900 })
  const scrollWidth = await page.locator('body').evaluate((body) => body.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(1024)
  await page.screenshot({ path: testInfo.outputPath('settings-tablet.png'), fullPage: true })
})
