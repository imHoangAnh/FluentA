import { expect, test } from '@playwright/test'

async function registerAndLogin(page) {
  const email = `pomodoro-complete+${crypto.randomUUID()}@example.com`
  const password = 'SecurePass123'
  await page.goto('http://127.0.0.1:5173/register')
  await page.getByLabel('Full name').fill('Pomodoro Complete Learner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const payload = await (await registerResponsePromise).json()
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { email, otp: payload.data.developmentOtp } })
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
}

test('links an owned Todo and provides transient stopwatch controls', async ({ page }) => {
  await registerAndLogin(page)
  await page.getByTestId('open-todo').click()
  await page.getByTestId('todo-title-input').fill('Focused linked task')
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByText('Focused linked task')).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.getByTestId('open-pomodoro').click()
  await page.getByTestId('pomodoro-task-select').selectOption({ label: 'Todo: Focused linked task' })
  const startRequestPromise = page.waitForRequest((request) => request.url().endsWith('/api/v1/pomodoro/start'))
  const startResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/pomodoro/start'))
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const startRequest = await startRequestPromise
  const startPayload = await (await startResponsePromise).json()
  expect(startRequest.postDataJSON().linkedTaskSource).toBe('todo')
  expect(startRequest.postDataJSON().linkedTaskId).toBeTruthy()
  expect(startPayload.data.linkedTaskSource).toBe('todo')
  await expect(page.getByTestId('pomodoro-linked-task')).toHaveText('Linked todo task')
  await page.getByRole('button', { name: 'Complete phase' }).click()
  await expect(page.getByTestId('pomodoro-today-count')).toHaveText('Completed today: 1')

  await page.getByRole('button', { name: 'Start stopwatch' }).click()
  await expect(page.getByTestId('stopwatch-time')).not.toHaveText('0:00', { timeout: 4000 })
  await page.getByRole('button', { name: 'Pause stopwatch' }).click()
  await page.getByRole('button', { name: 'Lap', exact: true }).click()
  await expect(page.getByText(/Lap 1:/)).toBeVisible()
  await page.getByRole('button', { name: 'Reset stopwatch' }).click()
  await expect(page.getByTestId('stopwatch-time')).toHaveText('0:00')
  await expect(page.getByText('No laps yet.')).toBeVisible()
})
