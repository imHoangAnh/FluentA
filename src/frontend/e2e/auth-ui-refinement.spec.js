import { expect, test } from '@playwright/test'

const publicRoutes = [
  ['/login', 'Welcome back'],
  ['/register', 'Create your account'],
  ['/verify-email?email=responsive%40fluenta.local', 'Verify your email'],
  ['/forgot-password', 'Reset your password'],
  ['/reset-password?token=responsive-token', 'Choose a new password'],
]

for (const viewport of [
  { name: 'mobile', width: 320, height: 760 },
  { name: 'compact-tablet', width: 768, height: 900 },
]) {
  test(`auth refinement stays usable without horizontal overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Anonymous auth layout proof' }) })
    })

    for (const [path, heading] of publicRoutes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('main.ds-root')).toBeVisible()
    }
  })
}
