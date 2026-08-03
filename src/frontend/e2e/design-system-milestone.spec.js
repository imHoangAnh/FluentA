import { expect, test } from '@playwright/test'

const user = {
  id: 'visual-proof-user',
  email: 'learner@fluenta.local',
  fullName: 'FluentA Learner',
  isEmailVerified: true,
}

async function mockFrontendApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let data = null

    if (path.endsWith('/auth/me')) data = user
    else if (path.endsWith('/review/dashboard')) data = { overdue: 3, dueToday: 9, newCards: 4, streakDays: 12 }
    else if (path.endsWith('/todos')) data = [
      { id: 'todo-1', title: 'Review vocabulary notes', isCompleted: false, createdAt: '2026-07-13T01:00:00Z', completedAt: null },
      { id: 'todo-2', title: 'Plan the next learning session', isCompleted: true, createdAt: '2026-07-13T02:00:00Z', completedAt: '2026-07-13T03:00:00Z' },
    ]
    else if (path.endsWith('/habits')) data = [
      { id: 'habit-1', name: 'Read English', icon: 'Book', isScheduledToday: true, isCheckedToday: true, currentStreak: 8 },
      { id: 'habit-2', name: 'Practice listening', icon: 'Study', isScheduledToday: true, isCheckedToday: false, currentStreak: 4 },
    ]
    else if (path.endsWith('/countdowns')) data = [{ id: 'countdown-1', name: 'IELTS Exam', targetDate: '2026-12-20T08:00:00Z' }]
    else if (path.endsWith('/boards')) data = []
    else data = []

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })
  })
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 1024, height: 900 },
]) {
  test(`milestone one ${viewport.name} shell, dashboard, and vocabulary`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockFrontendApis(page)

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
    await expect(page.getByLabel('Primary navigation')).toBeVisible()
    await expect(page.getByText('Review queue')).toBeVisible()
    await expect(page.getByText('IELTS Exam')).toBeVisible()
    await page.screenshot({ path: `test-results/milestone-dashboard-${viewport.name}.png`, fullPage: true })

    await page.getByRole('link', { name: 'Vocabulary' }).click()
    await expect(page.getByRole('heading', { name: 'Vocabulary', exact: true })).toBeVisible()
    await expect(page.getByText('No boards yet')).toBeVisible()
    await expect(page.getByText('Select or create a vocabulary board')).toBeVisible()
    await page.screenshot({ path: `test-results/milestone-vocabulary-${viewport.name}.png`, fullPage: true })
  })
}
