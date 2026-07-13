import { expect, test } from '@playwright/test';

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
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Countdown Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  return { token: loginPayload.data.accessToken };
}

test('countdown CRUD and completed-state smoke', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'countdown');
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByRole('link', { name: 'Countdowns' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/countdowns');
  await expect(page.getByRole('heading', { name: 'Countdowns' }).first()).toBeVisible();

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

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete IELTS Exam').click();
  await expect(page.getByRole('heading', { name: 'IELTS Exam' })).toBeHidden();

  const past = await page.request.post('http://127.0.0.1:5000/api/v1/countdowns', {
    headers,
    data: { name: 'Past deadline', targetDate: localDateTimeInput(-1).slice(0, 10), alerts: [{ alertDay: 'OnTargetDay', alertTime: '09:00' }] },
  });
  expect(past.status()).toBe(422);

  const protectedCountdown = (await (await page.request.post('http://127.0.0.1:5000/api/v1/countdowns', {
    headers,
    data: { name: 'Protected deadline', targetDate: localDateTimeInput(14).slice(0, 10), alerts: [{ alertDay: '1DayBefore', alertTime: '09:00' }] },
  })).json()).data;

  const second = await registerAndLogin(page, 'countdown-foreign');
  const foreign = await page.request.delete(`http://127.0.0.1:5000/api/v1/countdowns/${protectedCountdown.id}`, {
    headers: { Authorization: `Bearer ${second.token}` },
  });
  expect(foreign.status()).toBe(404);
});
