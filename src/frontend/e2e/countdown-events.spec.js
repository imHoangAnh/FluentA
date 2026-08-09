import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

function localDateTimeInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(9, 0, 0, 0);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function utcIso(offsetDays = 0) {
  return new Date(localDateTimeInput(offsetDays)).toISOString();
}

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'countdown-events' });
  return identity;
}

test('countdown CRUD and completed-state smoke', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'countdown');
  const headers = { Cookie: `access_token=${token}` };

  await page.getByRole('link', { name: 'Countdowns', exact: true }).click();
  await expect(page).toHaveURL('/countdowns');
  await expect(page.getByRole('heading', { name: 'Countdown', exact: true })).toBeVisible();

  const newCountdownButton = page.getByRole('button', { name: 'New Countdown' });
  await newCountdownButton.click();
  await expect(page.getByRole('dialog', { name: 'Create Countdown' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Create Countdown' })).toBeHidden();
  await expect(newCountdownButton).toBeFocused();
  await newCountdownButton.click();
  await page.getByTestId('countdown-name-input').fill('IELTS Exam');
  await page.getByTestId('countdown-target-input').fill(localDateTimeInput(21).slice(0, 10));
  await page.getByTestId('save-countdown-button').click();
  await expect(page.getByRole('heading', { name: 'IELTS Exam' })).toBeVisible();
  await expect(page.getByText(/days? left/)).toBeVisible();

  await page.getByRole('button', { name: 'Open actions for IELTS Exam' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'IELTS Exam' })).toBeHidden();

  const past = await page.request.post('https://localhost:7000/api/v1/countdowns', {
    headers,
    data: { name: 'Past deadline', targetDate: localDateTimeInput(-1).slice(0, 10), alerts: [{ alertDay: 'OnTargetDay', alertTime: '09:00' }] },
  });
  expect(past.status()).toBe(422);

  const protectedCountdown = (await (await page.request.post('https://localhost:7000/api/v1/countdowns', {
    headers,
    data: { name: 'Protected deadline', targetDate: localDateTimeInput(14).slice(0, 10), alerts: [{ alertDay: '1DayBefore', alertTime: '09:00' }] },
  })).json()).data;

  const second = await registerAndLogin(page, 'countdown-foreign');
  const foreign = await page.request.delete(`https://localhost:7000/api/v1/countdowns/${protectedCountdown.id}`, {
    headers: { Cookie: `access_token=${second.token}` },
  });
  expect(foreign.status()).toBe(404);
});
