import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'spec1-final-verification' });
  return identity;
}

test('final SPEC1 preferences and notification ownership', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'spec1-final');
  const headers = { Cookie: `access_token=${token}` };

  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('button', { name: 'Create habit' }).click();
  await page.getByTestId('habit-name-input').fill('No reminder habit');
  await page.getByRole('checkbox', { name: 'Reminder', exact: true }).uncheck();
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'No reminder habit' })).toBeVisible();
  const habits = await (await page.request.get(`https://localhost:7000/api/v1/habits?timeZoneId=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers })).json();
  expect(habits.data.find((habit) => habit.name === 'No reminder habit').reminderEnabled).toBe(false);

  await page.getByRole('link', { name: 'Go to overview' }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const unread = await (await page.request.get('https://localhost:7000/api/v1/notifications/unread-count', { headers })).json();
  expect(unread.data.count).toBe(0);
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('Your inbox is up to date.')).toBeVisible();
});
