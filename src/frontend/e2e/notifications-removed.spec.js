import { expect, test } from '@playwright/test'

const user = {
  id: 'notification-removal-proof-user',
  email: 'removal-proof@fluenta.local',
  fullName: 'Removal Proof Learner',
  isEmailVerified: true,
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 1024, height: 900 },
]) {
  test(`removed inbox preserves navigation on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const inboxRequests = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/v1/notifications')) {
        inboxRequests.push(request.url())
      }
    })
    await page.route('**/api/v1/**', (route) => {
      const pathname = new URL(route.request().url()).pathname
      const data = pathname.endsWith('/auth/me') ? user
        : pathname.endsWith('/review/dashboard') ? { localDate: '2026-10-08', dueCount: 0 }
          : []
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data, errors: [] }),
      })
    })
    await page.route('**/hubs/**', (route) => route.fulfill({ status: 401 }))

    await page.goto('/todo')
    const navigation = page.getByLabel('Primary navigation')
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Todo', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(navigation.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0)
    await expect(navigation.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/profile')
    await expect(navigation.getByRole('button', { name: 'Notifications', exact: true })).toHaveCount(0)
    await expect(navigation.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0)
    const logout = navigation.locator('button[aria-label="Log out"]')
    if (viewport.width > 1100) await expect(logout).toBeVisible()
    else await expect(logout).toBeHidden()

    await navigation.getByRole('link', { name: 'Notes', exact: true }).click()
    await expect(page).toHaveURL(/\/notes$/)
    await expect(page.getByRole('heading', { name: 'Notes', exact: true }).first()).toBeVisible()

    for (const oldPath of ['/notifications', '/notifications/old']) {
      await page.goto(oldPath)
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
      await expect(navigation.getByRole('button', { name: 'Notifications', exact: true })).toHaveCount(0)
      await expect(navigation.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0)
    }

    expect(inboxRequests).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('shell-without-inbox.png'), fullPage: true })
  })
}
