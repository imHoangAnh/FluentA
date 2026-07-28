import { expect, test } from '@playwright/test'

const user = {
  id: 'dashboard-review-queue-user',
  email: 'review-queue@fluenta.local',
  fullName: 'Review Queue Learner',
  isEmailVerified: true,
}

test('Review Queue keeps one learning word out of the Due Today circle', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { accessToken: 'review-queue-token', user } }),
      })
      return
    }

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
      return
    }

    if (request.method() === 'GET' && path.endsWith('/review/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            boardId: null,
            boardName: null,
            totalCards: 1,
            totalReviews: 0,
            streakDays: 0,
            retentionRate: 0,
            overdue: 0,
            dueToday: 0,
            newCards: 1,
            forecast: [],
          },
        }),
      })
      return
    }

    if (request.method() === 'GET' && (path.endsWith('/todos') || path.endsWith('/habits') || path.endsWith('/countdowns'))) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
      return
    }

    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Deterministic Review Queue fixture' }) })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('SecurePass123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const ring = page.getByTestId('dashboard-review-due-ring')
  await expect(ring).toHaveAttribute('aria-label', '0 words due for review today. 1 new word available to learn.')
  await expect(ring.getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByTestId('dashboard-review-due-badge')).toHaveText('0 due')
  await expect(page.getByTestId('dashboard-review-count').getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByTestId('dashboard-learning-count').getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByText('No reviews due today.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Review' })).toHaveAttribute('href', '/review')

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasHorizontalOverflow).toBe(false)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(ring).toBeVisible()
  await expect(page.getByTestId('dashboard-learning-count')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Review' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})
