import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }]) {
  test(`Pomodoro removal keeps navigation and legacy widget layouts at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const obsoleteRequests = []
    page.on('request', request => {
      if (/\/api\/v1\/pomodoro|\/hubs\//.test(request.url())) obsoleteRequests.push(request.url())
    })
    await page.addInitScript(() => {
      localStorage.setItem('dashboard-widget-layout', JSON.stringify({ version: 1, order: ['project', 'pomodoro', 'habits', 'todo'] }))
    })
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname
      const data = path.endsWith('/auth/me')
        ? { id: 'removal-user', fullName: 'Removal Learner', email: 'proof@example.test', isEmailVerified: true }
        : path.endsWith('/review/dashboard') ? { localDate: '2026-10-08', dueCount: 0 } : []
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data, errors: [] }) })
    })

    await page.goto('/pomodoro')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pomodoro', exact: true })).toHaveCount(0)
    const widgets = page.locator('[data-testid^="dashboard-widget-"]:not([data-testid="dashboard-widget-grid"])')
    await expect(widgets).toHaveCount(3)
    expect(await widgets.evaluateAll(elements => elements.map(element => element.getAttribute('data-testid'))))
      .toEqual(['dashboard-widget-project', 'dashboard-widget-habits', 'dashboard-widget-todo'])
    await page.getByRole('button', { name: 'Overview widgets' }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem')).toHaveCount(5)
    await expect(menu.getByRole('menuitem', { name: 'Pomodoro' })).toHaveCount(0)
    await menu.getByRole('menuitem', { name: 'Review queue' }).click()
    await expect(widgets).toHaveCount(4)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dashboard-widget-layout')).order))
      .toEqual(['project', 'habits', 'todo', 'review'])

    await page.getByRole('link', { name: 'Notes', exact: true }).click()
    await expect(page).toHaveURL(/\/notes$/)
    await expect(page.getByText('No note boards yet')).toBeVisible()
    await page.getByRole('link', { name: 'Todo', exact: true }).click()
    await expect(page).toHaveURL(/\/todo$/)
    await expect(page.getByRole('button', { name: 'Sort My Day tasks' })).toBeVisible()
    await page.goto('/pomodoro/history')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
    expect(obsoleteRequests).toEqual([])
  })
}
