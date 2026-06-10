import { expect, test } from '@playwright/test'

test('SPEC core learning loop works in the target browser', async ({ page, baseURL }) => {
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const email = `cross-browser+${crypto.randomUUID()}@example.com`
  const password = 'SecurePass123'

  await page.goto(`${baseURL}/register`)
  await expect(page).toHaveTitle(/FluentA/)
  await page.getByLabel('Full name').fill('Cross Browser Learner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const registerPayload = await (await registerResponsePromise).json()
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { token: registerPayload.data.emailVerificationToken },
  })

  await expect(page).toHaveURL(`${baseURL}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible()
  await page.getByTestId('board-name-input').fill('Cross Browser Board')
  await page.getByTestId('create-board-button').click()
  await expect(page.getByRole('heading', { name: 'Cross Browser Board' })).toBeVisible()

  await page.getByTestId('page-name-input').fill('Cross Browser Page')
  await page.getByTestId('create-page-button').click()
  await expect(page.locator('.page-select').filter({ hasText: 'Cross Browser Page' })).toBeVisible()

  await page.getByRole('textbox', { name: 'New word', exact: true }).fill('portable')
  await page.getByRole('textbox', { name: 'New Vietnamese meaning', exact: true }).fill('co the mang theo')
  await page.getByRole('textbox', { name: 'New English meaning', exact: true }).fill('easy to carry or move')
  await page.getByRole('textbox', { name: 'New example', exact: true }).fill('The app should feel portable across browsers.')
  await page.getByTestId('create-word-button').click()
  await expect(page.getByRole('textbox', { name: 'Word for portable', exact: true })).toHaveValue('portable')

  await page.getByTestId('open-flashcards').click()
  await expect(page.getByText('Cross Browser Board - All Words')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'portable', exact: true }).first()).toBeVisible()
  await expect(page.locator('#root')).not.toBeEmpty()
  expect(consoleErrors).toEqual([])
})
