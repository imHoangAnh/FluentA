import { expect, test } from '@playwright/test'

async function registerAndOpenPomodoro(page) {
  const email = `pomodoro-history+${crypto.randomUUID()}@example.com`
  const password = 'SecurePass123'
  await page.goto('http://127.0.0.1:5173/register')
  await page.getByLabel('Full name').fill('Pomodoro History Learner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const registerPayload = await (await registerResponsePromise).json()
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  })
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
  await page.getByRole('link', { name: 'Pomodoro' }).click()
  await expect(page.getByRole('heading', { name: 'Focus timer' })).toBeVisible()
}

test('completed work sessions update today count and schedule configured long break', async ({ page }) => {
  await registerAndOpenPomodoro(page)

  await page.getByTestId('pomodoro-long-after-input').fill('2')
  await page.getByTestId('pomodoro-long-break-input').fill('20')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Settings saved.')).toBeVisible()

  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('0')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Complete phase' }).click()
  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('1')
  await expect(page.getByText(/ShortBreak Session/)).toBeVisible()

  await page.getByRole('button', { name: 'Complete phase' }).click()
  await page.getByRole('button', { name: 'Complete phase' }).click()
  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('2')
  await expect(page.getByText(/LongBreak Session/)).toBeVisible()
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('20:00')
})
