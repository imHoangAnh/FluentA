import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function utcIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'dashboard-overview' });
  return identity;
}

test('Dashboard Overview is the default authenticated home with actionable widgets', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  const { token } = await registerAndLogin(page);
  const headers = { Cookie: `access_token=${token}` };
  const today = todayInput();

  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Review' })).toHaveAttribute('href', '/review');
  await expect(page.getByText('No reviews due today.')).toBeVisible();
  const widgetsMenu = page.getByRole('button', { name: 'Overview widgets' });
  await widgetsMenu.click();
  const widgets = page.getByRole('menu');
  await widgets.getByRole('menuitem', { name: 'Habit tracker' }).click();

  await page.request.post('https://localhost:7000/api/v1/todos', {
    headers,
    data: { title: 'Dashboard planning task', date: today, note: 'Overview proof' },
  });
  await page.request.post('https://localhost:7000/api/v1/habits', {
    headers,
    data: {
      name: 'Dashboard reading habit',
      description: 'Overview proof',
      icon: 'Book',
      frequency: 'Daily',
      startDate: today,
      goalDays: null,
      reminderTime: '20:00',
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  await page.request.post('https://localhost:7000/api/v1/countdowns', {
    headers,
    data: { name: 'Dashboard IELTS date', targetDate: utcIso(14).slice(0, 10), alerts: [{ alertDay: '1DayBefore', alertTime: '09:00' }] },
  });

  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.goto('/');

  await expect(page.getByText('Dashboard planning task')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Dashboard reading habit')).toBeVisible();
  await expect(page.getByText('Dashboard IELTS date')).toBeVisible();

  await page.getByLabel('Check todo Dashboard planning task').click();
  await expect(page.getByLabel('Uncheck todo Dashboard planning task')).toBeVisible();

  await page.getByLabel('Check habit Dashboard reading habit').click();
  await expect(page.getByLabel('Uncheck habit Dashboard reading habit')).toBeVisible();

  const todoResponse = await page.request.get(`https://localhost:7000/api/v1/todos?date=${today}`, { headers });
  const todos = (await todoResponse.json()).data;
  expect(todos.find((todo) => todo.title === 'Dashboard planning task')?.isCompleted).toBe(true);

  const habitResponse = await page.request.get(`https://localhost:7000/api/v1/habits?timeZoneId=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers });
  const habits = (await habitResponse.json()).data;
  expect(habits.find((habit) => habit.name === 'Dashboard reading habit')?.isCheckedToday).toBe(true);
  expect(consoleErrors).toEqual([]);
});
