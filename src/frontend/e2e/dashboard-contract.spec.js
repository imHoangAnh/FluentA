import { expect, test } from '@playwright/test'

for (const width of [1440, 768]) {
  test(`Dashboard isolates loading/errors and recovers toggles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install({ time: new Date('2026-10-08T16:30:00Z') })
    await page.addInitScript(() => {
      localStorage.setItem('dashboard-widget-layout', JSON.stringify({
        version: 1, order: ['review', 'todo', 'countdown', 'habits', 'project'],
      }))
    })
    let releaseReview
    const reviewGate = new Promise(resolve => { releaseReview = resolve })
    let failProject = true
    let failTodo = true
    let failHabit = true
    const todo = {
      id: 'dashboard-todo', title: 'Plan tomorrow', date: '2026-10-08', sortOrder: 0,
      isCompleted: false, isImportant: false, createdAt: '2026-10-08T00:00:00Z',
      updatedAt: '2026-10-08T00:00:00Z',
    }
    const habit = {
      id: 'dashboard-habit', name: 'Read English', icon: 'Book', frequency: 'Daily',
      customDays: [], startDate: '2026-10-01', currentStreak: 3,
      isScheduledToday: true, isCheckedToday: false,
    }
    await page.route('**/api/v1/**', async route => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      const fulfill = (data, status = 200) => route.fulfill({
        status, contentType: 'application/json',
        body: JSON.stringify({ success: status === 200, data, errors: status === 200 ? [] : [{ code: 'TEST_UNAVAILABLE', message: 'Unavailable' }] }),
      })
      if (path.endsWith('/auth/me')) return fulfill({ id: 'dashboard-user', fullName: 'Dashboard Learner', email: 'proof@example.test', isEmailVerified: true })
      if (path.endsWith('/review/dashboard')) {
        await reviewGate
        return fulfill({ localDate: '2026-10-08', dueCount: 5 })
      }
      if (path.endsWith('/todos/dashboard-todo')) {
        if (failTodo) return fulfill(null, 503)
        todo.isCompleted = request.postDataJSON().isCompleted
        return fulfill(todo)
      }
      if (path.endsWith('/todos')) return fulfill([todo])
      if (path.endsWith('/habits/dashboard-habit/entries')) {
        if (failHabit) return fulfill(null, 503)
        expect(request.postDataJSON()).toEqual({ date: '2026-10-08' })
        habit.isCheckedToday = !habit.isCheckedToday
        return fulfill({ habitId: habit.id, date: '2026-10-08', isCompleted: habit.isCheckedToday })
      }
      if (path.endsWith('/habits')) return fulfill([habit])
      if (path.endsWith('/countdowns')) return fulfill([
        { id: 'later', name: 'Later milestone', targetDate: '2026-10-10', isCompleted: false },
        { id: 'nearest', name: 'Nearest milestone', targetDate: '2026-10-09', isCompleted: false },
        { id: 'completed', name: 'Old milestone', targetDate: '2026-10-07', isCompleted: true },
      ])
      if (path.endsWith('/project/boards')) return failProject ? fulfill(null, 503) : fulfill([{ id: 'board-1', name: 'My project', cardCount: 2 }])
      return fulfill([])
    })

    await page.goto('/')
    await expect(page.getByLabel('Loading Review queue')).toBeVisible()
    await expect(page.getByText('Plan tomorrow', { exact: true })).toBeVisible()
    await expect(page.getByText('Nearest milestone', { exact: true })).toBeVisible()
    await expect(page.getByText('1 day left')).toBeVisible()
    await expect(page.locator('time[datetime="2026-10-09"]')).toBeVisible()
    releaseReview()
    await expect(page.getByTestId('dashboard-review-due-badge')).toHaveText('5 due')
    await expect(page.getByText('Could not load Project.')).toBeVisible({ timeout: 15_000 })
    failProject = false
    await page.getByRole('button', { name: 'Retry loading Project' }).click()
    await expect(page.getByText('My project', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Check todo Plan tomorrow', exact: true }).click()
    await expect(page.getByText('Could not update Todo. Your previous state is unchanged.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check todo Plan tomorrow', exact: true })).toBeEnabled()
    failTodo = false
    await page.getByRole('button', { name: 'Retry Todo update' }).click()
    await expect(page.getByRole('button', { name: 'Uncheck todo Plan tomorrow', exact: true })).toBeEnabled()

    await page.getByRole('button', { name: 'Check habit Read English', exact: true }).click()
    await expect(page.getByText('Could not update Habit. Your previous state is unchanged.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check habit Read English', exact: true })).toBeEnabled()
    failHabit = false
    await page.getByRole('button', { name: 'Retry Habit update' }).click()
    await expect(page.getByRole('button', { name: 'Uncheck habit Read English', exact: true })).toBeEnabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.screenshot({ path: `test-results/dashboard-contract-${width}.png`, fullPage: true })
  })
}
