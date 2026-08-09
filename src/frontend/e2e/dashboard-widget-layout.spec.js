import { expect, test } from '@playwright/test'

const user = {
  id: 'dashboard-widget-layout-user',
  email: 'widget-layout@fluenta.local',
  fullName: 'Widget Layout Learner',
  isEmailVerified: true,
}

async function mockDashboardApi(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/login') || path.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
      return
    }
    if (path.endsWith('/review/dashboard')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { overdue: 0, dueToday: 0, newCards: 0 } }) })
      return
    }
    if (path.endsWith('/todos') || path.endsWith('/habits') || path.endsWith('/countdowns')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
      return
    }
    if (path.endsWith('/project/boards')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
      return
    }
    if (path.endsWith('/pomodoro/current')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { phase: 'Work', state: 'Idle', remainingSeconds: 0 } }) })
      return
    }
    if (path.endsWith('/pomodoro/today')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { completedWorkSessions: 0 } }) })
      return
    }
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Deterministic Dashboard widget fixture' }) })
  })
}

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('SecurePass123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
}

function widget(page, id) {
  return page.getByTestId(`dashboard-widget-${id}`)
}

function allWidgets(page) {
  return page.locator('[data-testid^="dashboard-widget-"]:not([data-testid="dashboard-widget-grid"])')
}

test('Overview widget menu enforces bounds, persists order, and stays within the viewport', async ({ page }) => {
  await mockDashboardApi(page)
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('dashboard-widget-layout'))
  await login(page)

  await expect(widget(page, 'review')).toBeVisible()
  await expect(widget(page, 'todo')).toBeVisible()
  await expect(widget(page, 'countdown')).toBeVisible()
  await expect(widget(page, 'habits')).toHaveCount(0)

  await expect(page.getByRole('button', { name: 'Move Review queue widget', exact: true })).toHaveAttribute('aria-roledescription', 'sortable')

  const menuButton = page.getByRole('button', { name: 'Overview widgets' })
  await menuButton.click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Review queue' })).toContainText('Review queue')
  await expect(menu.getByText('added', { exact: false })).toHaveCount(0)
  await menu.getByRole('menuitem', { name: 'Habit tracker' }).click()
  await expect(widget(page, 'habits')).toBeVisible()

  await menuButton.click()
  await menu.getByRole('menuitem', { name: 'Todo' }).click()
  await expect(widget(page, 'todo')).toHaveCount(0)
  await expect(allWidgets(page)).toHaveCount(3)

  await menuButton.click()
  await menu.getByRole('menuitem', { name: 'Todo' }).click()
  await menuButton.click()
  await menu.getByRole('menuitem', { name: 'Project' }).click()
  await menuButton.click()
  await menu.getByRole('menuitem', { name: 'Pomodoro' }).click()
  await expect(allWidgets(page)).toHaveCount(6)
  await expect(widget(page, 'project')).toBeVisible()
  await expect(widget(page, 'pomodoro')).toBeVisible()
  await expect.poll(() => allWidgets(page).evaluateAll((elements) => elements.map((element) =>
    ['col-span-7', 'col-span-5', 'col-span-5', 'col-span-7', 'col-span-7', 'col-span-5'].find((slot) => element.classList.contains(slot)),
  ))).toEqual(['col-span-7', 'col-span-5', 'col-span-5', 'col-span-7', 'col-span-7', 'col-span-5'])

  const handles = page.getByRole('button', { name: /Move .* widget/ })
  const source = await handles.nth(0).boundingBox()
  const target = await handles.nth(1).boundingBox()
  if (!source || !target) throw new Error('Dashboard drag handles are not measurable')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + source.width / 2 + 20, source.y + source.height / 2 + 20)
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(allWidgets(page).first()).not.toHaveAttribute('data-testid', 'dashboard-widget-review')

  const viewportState = await page.evaluate(() => ({
    documentScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
    bodyScroll: document.body.scrollHeight > document.body.clientHeight,
  }))
  expect(viewportState.documentScroll).toBe(false)
  expect(viewportState.bodyScroll).toBe(false)

  const firstAfterDrag = await allWidgets(page).first().getAttribute('data-testid')
  await page.reload()
  await expect(allWidgets(page).first()).toHaveAttribute('data-testid', firstAfterDrag)
})
