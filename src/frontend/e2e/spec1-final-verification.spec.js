import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'spec1-final-verification' });
  return identity;
}

test('final SPEC1 retains Habit tracking without reminders or an inbox', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'spec1-final');
  const headers = { Cookie: `access_token=${token}` };

  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('button', { name: 'Create habit' }).click();
  await page.getByTestId('habit-name-input').fill('No reminder habit');
  await expect(page.getByRole('checkbox', { name: 'Reminder', exact: true })).toHaveCount(0);
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'No reminder habit' })).toBeVisible();
  const habits = await (await page.request.get(`https://localhost:7000/api/v1/habits?timeZoneId=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers })).json();
  expect(habits.data.find((habit) => habit.name === 'No reminder habit')).not.toHaveProperty('reminderEnabled');

  await page.getByRole('link', { name: 'Go to overview' }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toHaveCount(0);
});
