import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

const appUrl = process.env.E2E_BASE_URL ?? ''
const apiUrl = process.env.E2E_API_URL ?? 'https://localhost:7000/api/v1'

function localDateTime(offsetMilliseconds) {
  const date = new Date(Date.now() + offsetMilliseconds)
  return {
    date: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`,
    time: `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`,
    scheduledAtUtc: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString(),
  }
}

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'todo-reminder-notification' });
  return identity;
}

test('Todo reminder delivers once and its notification opens the owned task details', async ({ page }) => {
  test.setTimeout(180_000)
  const { token } = await registerAndLogin(page, 'todo-reminder')
  const headers = { Cookie: `access_token=${token}` }
  const reminder = localDateTime(90_000)

  await page.goto(`${appUrl}/todo`)
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/todos') && response.request().method() === 'POST')
  await page.getByTestId('todo-title-input').fill('Live reminder navigation')
  await page.getByTestId('todo-title-input').press('Enter')
  const created = (await (await createResponsePromise).json()).data

  const details = page.getByLabel('Details for Live reminder navigation')
  await details.getByRole('button', { name: 'Reminder: Not set' }).click()
  await details.getByLabel('Reminder time').fill(reminder.time)
  const reminderResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/todos/${created.id}`) && response.request().method() === 'PATCH')
  await details.getByRole('button', { name: 'Save' }).click()
  const saved = (await (await reminderResponsePromise).json()).data
  expect(saved.reminder.time).toBe(reminder.time)
  expect(saved.reminder.timeZoneId).toBeTruthy()

  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/notifications`, { headers })
    const payload = await response.json()
    return payload.data.filter((item) => item.actionPath === `/todo?taskId=${created.id}`).length
  }, { timeout: 150_000, intervals: [1_000, 2_000, 5_000] }).toBe(1)

  await page.goto(`${appUrl}/notifications`)
  await page.getByRole('button', { name: /Todo reminder.*Unread.*Activate to open/ }).click()
  await expect(page).toHaveURL(`${appUrl}/todo?taskId=${created.id}`)
  await expect(page.getByLabel('Details for Live reminder navigation')).toBeVisible()

  const notificationPayload = await (await page.request.get(`${apiUrl}/notifications`, { headers })).json()
  const delivered = notificationPayload.data.filter((item) => item.actionPath === `/todo?taskId=${created.id}`)
  expect(delivered).toHaveLength(1)
  expect(delivered[0].readAt).toBeTruthy()
})

test('Todo reminder lifecycle clears past moves, copies recurrence, and hides foreign tasks', async ({ page }) => {
  const owner = await registerAndLogin(page, 'todo-reminder-lifecycle')
  const headers = { Cookie: `access_token=${owner.token}` }
  const future = localDateTime(48 * 60 * 60 * 1000)
  const yesterday = localDateTime(-24 * 60 * 60 * 1000).date
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const movable = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: {
      title: 'Move reminder to past',
      date: future.date,
      reminder: { time: future.time, timeZoneId: timezone, scheduledAtUtc: future.scheduledAtUtc },
    },
  })).json()).data
  const moved = await page.request.patch(`${apiUrl}/todos/${movable.id}`, { headers, data: { date: yesterday } })
  const movedPayload = await moved.json()
  expect(moved.status()).toBe(200)
  expect(movedPayload.data.reminder).toBeNull()
  expect(movedPayload.data.warningCode).toBe('reminder-cleared-after-date-change')

  const recurring = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: {
      title: 'Recurring reminder copy',
      date: future.date,
      repeatPattern: 'Daily',
      reminder: { time: future.time, timeZoneId: timezone, scheduledAtUtc: future.scheduledAtUtc },
    },
  })).json()).data
  const completedPayload = await (await page.request.patch(`${apiUrl}/todos/${recurring.id}`, { headers, data: { isCompleted: true } })).json()
  expect(completedPayload.data.reminder).toBeNull()

  const nextDate = localDateTime(72 * 60 * 60 * 1000).date
  const nextItems = (await (await page.request.get(`${apiUrl}/todos?date=${nextDate}`, { headers })).json()).data
  const child = nextItems.find((item) => item.title === 'Recurring reminder copy')
  expect(child.reminder.time).toBe(future.time)
  expect(child.reminder.timeZoneId).toBe(timezone)

  const foreign = await registerAndLogin(page, 'todo-reminder-foreign')
  const foreignRead = await page.request.get(`${apiUrl}/todos/${recurring.id}`, {
    headers: foreign.headers,
  })
  expect(foreignRead.status()).toBe(404)
})
