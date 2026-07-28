import { expect, test } from '@playwright/test'

const user = {
  id: 'app-shell-persistence-user',
  email: 'app-shell@fluenta.local',
  fullName: 'AppShell Learner',
  isEmailVerified: true,
}

test('keeps one AppShell mounted across protected client-side navigation', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { accessToken: 'app-shell-persistence-token', user } }),
      })
      return
    }

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
      return
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Deterministic AppShell persistence fixture' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('SecurePass123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page).toHaveURL('http://127.0.0.1:5173/')
  await expect(page.getByLabel('Primary navigation')).toBeVisible()
  await expect(page.getByLabel('Primary navigation').getByRole('link', { name: 'Overview', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Log out' }).hover()
  await expect(page.getByRole('tooltip', { name: 'Log out' })).toBeVisible()
  const initialShell = await page.locator('.ds-root').elementHandle()

  await expect(page.getByRole('button', { name: /(?:Collapse|Expand) sidebar/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Todo', exact: true }).click()

  await expect(page).toHaveURL('http://127.0.0.1:5173/todo')
  await expect(page.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/')
  const todoTitleInput = page.getByTestId('todo-title-input')
  await todoTitleInput.focus()
  await expect.poll(() => todoTitleInput.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outline: style.outlineStyle, boxShadow: style.boxShadow }
  })).toEqual({ outline: 'none', boxShadow: 'none' })
  await expect(page.locator('#main-content > h1')).toHaveText('Todo')
  await expect(page.getByLabel('Primary navigation')).toHaveCount(1)

  const currentShell = await page.locator('.ds-root').elementHandle()
  expect(initialShell).not.toBeNull()
  expect(currentShell).not.toBeNull()
  expect(await initialShell.evaluate((node, nextNode) => node === nextNode, currentShell)).toBe(true)

  await page.getByRole('link', { name: 'Open profile' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/profile')
  await page.getByRole('link', { name: 'Go to overview' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
})
