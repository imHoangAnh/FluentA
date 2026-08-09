import { expect, test } from '@playwright/test'
import { apiUrl, loginSeededApi } from './support/auth-fixture.js'

const user = {
  id: 'notification-proof-user',
  email: 'notifications@fluenta.local',
  fullName: 'Notification Learner',
  isEmailVerified: true,
}

const initialItems = [
  { id: '11111111-1111-1111-1111-111111111111', type: 'HabitReminder', title: 'Habit reminder', message: 'Practice listening today.', readAt: null, createdAt: '2026-07-13T09:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', type: 'CountdownAlert', title: 'Countdown reminder', message: 'Your IELTS countdown has completed.', readAt: null, createdAt: '2026-07-13T08:00:00Z' },
]

async function mockAuthenticatedInbox(page, { failList = false, items: sourceItems = initialItems } = {}) {
  let items = structuredClone(sourceItems)

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
    if (path.endsWith('/notifications/unread-count')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { count: items.filter((item) => !item.readAt).length } }) })
    if (path.endsWith('/notifications') && request.method() === 'GET') {
      if (failList) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Unavailable' } }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: items }) })
    }
    if (path.endsWith('/notifications/read-all') && request.method() === 'PATCH') {
      await new Promise((resolve) => setTimeout(resolve, 150))
      items = items.map((item) => ({ ...item, readAt: item.readAt ?? '2026-07-13T10:00:00Z' }))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { count: 1 } }) })
    }
    const readMatch = path.match(/\/notifications\/([^/]+)\/read$/)
    if (readMatch && request.method() === 'PATCH') {
      await new Promise((resolve) => setTimeout(resolve, 150))
      items = items.map((item) => item.id === readMatch[1] ? { ...item, readAt: '2026-07-13T10:00:00Z' } : item)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: readMatch[1], readAt: '2026-07-13T10:00:00Z' } }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  })
}

test('Notification bell opens a scrollable inbox preview with a full-inbox action', async ({ page }) => {
  const manyItems = Array.from({ length: 12 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, '0')}-1111-1111-1111-111111111111`,
    type: 'HabitReminder',
    title: `Habit reminder ${index + 1}`,
    message: 'Practice listening today.',
    readAt: index % 2 === 0 ? null : '2026-07-13T10:00:00Z',
    createdAt: '2026-07-13T09:00:00Z',
  }))
  await mockAuthenticatedInbox(page, { items: manyItems })
  await page.goto('/notifications')

  await page.getByRole('button', { name: 'Notifications' }).click()
  await expect(page.getByRole('menuitem', { name: 'Show all notifications' })).toHaveAttribute('href', '/notifications')
  const previewList = page.getByLabel('Recent notifications').first()
  await expect(previewList.getByText('Habit reminder 12')).toBeVisible()
  expect(await previewList.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
})

test('Notifications inbox covers unread, pending, mark-one, mark-all, and responsive states', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockAuthenticatedInbox(page)
  await page.goto('/notifications')

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('2 unread notifications.')).toBeVisible()
  const unread = page.getByRole('button', { name: /Habit reminder/ })
  await unread.click()
  await expect(unread).toBeDisabled()
  await expect(page.getByText('1 unread notification.')).toBeVisible()
  const markAll = page.getByRole('button', { name: 'Mark all read' })
  await markAll.click()
  await expect(page.getByRole('button', { name: 'Marking read…' })).toBeDisabled()
  await expect(page.getByText('Your inbox is up to date.')).toBeVisible()

  await page.screenshot({ path: testInfo.outputPath('notifications-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1024, height: 900 })
  const scrollWidth = await page.locator('body').evaluate((body) => body.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(1024)
  await page.screenshot({ path: testInfo.outputPath('notifications-tablet.png'), fullPage: true })
})

test('Notifications inbox exposes a recoverable error state', async ({ page }) => {
  await mockAuthenticatedInbox(page, { failList: true })
  await page.goto('/notifications')
  await expect(page.getByRole('alert')).toContainText('Could not load notifications', { timeout: 15_000 })
})

test('Notifications API keeps empty inbox and unknown notification owner scoped', async ({ request }) => {
  const { headers } = await loginSeededApi(request, { prefix: 'notifications-api' })

  expect((await request.get(apiUrl('/notifications'), { headers })).status()).toBe(200)
  expect((await request.get(apiUrl('/notifications/unread-count'), { headers })).status()).toBe(200)
  expect((await request.patch(apiUrl('/notifications/33333333-3333-3333-3333-333333333333/read'), { headers })).status()).toBe(404)
  expect((await request.patch(apiUrl('/notifications/read-all'), { headers })).status()).toBe(200)
})
