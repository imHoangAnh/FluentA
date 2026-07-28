import { expect, test } from '@playwright/test'

const user = {
  id: 'dropdown-polish-user',
  email: 'dropdown-polish@fluenta.local',
  fullName: 'Dropdown Learner',
  isEmailVerified: true,
}

async function loginWithMockedApi(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname

    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { accessToken: 'dropdown-polish-token', user } }),
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
      body: JSON.stringify({ message: 'Deterministic dropdown polish fixture' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('SecurePass123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
}

test('native selects and action menus use the shared polished treatment', async ({ page }) => {
  await loginWithMockedApi(page)

  await page.getByRole('link', { name: 'Pomodoro', exact: true }).click()
  const select = page.getByTestId('pomodoro-task-select')
  await expect(select).toBeVisible()

  await expect.poll(() => select.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      appearance: style.appearance,
      backgroundImage: style.backgroundImage,
      borderRadius: style.borderRadius,
      minHeight: style.minHeight,
    }
  })).toEqual({
    appearance: 'none',
    backgroundImage: expect.stringContaining('svg'),
    borderRadius: '8px',
    minHeight: '40px',
  })

  await select.focus()
  await expect.poll(() => select.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outline: style.outlineStyle, boxShadow: style.boxShadow }
  })).toEqual({ outline: 'none', boxShadow: expect.stringContaining('inset') })

  await page.getByRole('link', { name: 'Todo', exact: true }).click()
  await page.getByRole('button', { name: 'Sort My Day tasks' }).click()

  const menu = page.getByRole('menu')
  const menuItem = page.getByRole('menuitem').first()
  await expect(menu).toBeVisible()
  await expect(menuItem).toBeVisible()

  await expect.poll(() => menu.evaluate((element) => {
    const style = getComputedStyle(element)
    return { borderRadius: style.borderRadius, padding: style.padding, shadow: style.boxShadow }
  })).toEqual({ borderRadius: '10px', padding: '6px', shadow: expect.not.stringMatching(/^none$/) })

  await expect.poll(() => menuItem.evaluate((element) => getComputedStyle(element).minHeight)).toBe('40px')
})
