import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'pomodoro-complete' });
  return identity;
}

test('links an owned Todo and provides transient stopwatch controls', async ({ page }) => {
  await registerAndLogin(page)
  await page.getByRole('link', { name: 'Todo' }).click()
  await page.getByTestId('todo-title-input').fill('Focused linked task')
  await page.getByTestId('todo-title-input').press('Enter')
  await expect(page.getByText('Focused linked task')).toBeVisible()

  await page.getByRole('link', { name: 'Pomodoro' }).click()
  await page.getByTestId('pomodoro-task-select').click()
  await page.getByRole('option', { name: 'Todo: Focused linked task', exact: true }).click()
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
  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('1')

  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await page.getByRole('button', { name: 'Start stopwatch' }).click()
  await expect(page.getByTestId('stopwatch-time')).not.toHaveText('0:00', { timeout: 4000 })
  await page.getByRole('button', { name: 'Pause stopwatch' }).click()
  await page.getByRole('button', { name: 'Pomo' }).click()
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await page.getByRole('button', { name: 'Lap', exact: true }).click()
  await expect(page.getByText('Lap 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reset stopwatch' }).click()
  await expect(page.getByTestId('stopwatch-time')).toHaveText('0:00')
})
