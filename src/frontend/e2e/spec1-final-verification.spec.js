import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';
  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('SPEC1 Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registration = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const payload = await (await registration).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { token: payload.data.emailVerificationToken } });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const login = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  return (await (await login).json()).data.accessToken;
}

test('final SPEC1 preferences and notification ownership', async ({ page }) => {
  const token = await registerAndLogin(page, 'spec1-final');
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByTestId('open-habits').click();
  await page.getByTestId('habit-name-input').fill('No reminder habit');
  await page.getByLabel('Daily reminder').uncheck();
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'No reminder habit' })).toBeVisible();
  const habits = await (await page.request.get(`http://127.0.0.1:5000/api/v1/habits?timeZoneId=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers })).json();
  expect(habits.data.find((habit) => habit.name === 'No reminder habit').reminderEnabled).toBe(false);

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByText('Dashboard Overview')).toBeVisible();
  await page.getByLabel('Dashboard widget settings').click();
  await page.getByLabel('todo').uncheck();
  await expect(page.getByText('Todo Today')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('dashboard-visible-widgets'))).toContain('"todo":false');

  const unread = await (await page.request.get('http://127.0.0.1:5000/api/v1/notifications/unread-count', { headers })).json();
  expect(unread.data.count).toBe(0);
  await page.getByTestId('open-notifications').click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Your notification inbox is clear.')).toBeVisible();
});
