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
    data: { token: registerPayload.data.emailVerificationToken },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
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

  await page.getByTestId('open-countdown').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/countdown');
  await expect(page.getByRole('heading', { name: 'Important dates' })).toBeVisible();

  await page.getByTestId('countdown-name-input').fill('IELTS Exam');
  await page.getByTestId('countdown-target-input').fill(localDateTimeInput(21));
  await page.getByTestId('countdown-icon-input').fill('Exam');
  await page.getByTestId('save-countdown-button').click();
  await expect(page.getByRole('heading', { name: 'IELTS Exam' })).toBeVisible();
  await expect(page.getByText(/remaining/)).toBeVisible();

  await page.getByLabel('Edit IELTS Exam').click();
  await page.getByTestId('countdown-name-input').fill('IELTS Final');
  await page.getByTestId('save-countdown-button').click();
  await expect(page.getByRole('heading', { name: 'IELTS Final' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete IELTS Final').click();
  await expect(page.getByRole('heading', { name: 'IELTS Final' })).toBeHidden();

  const past = (await (await page.request.post('http://127.0.0.1:5000/api/v1/countdowns', {
    headers,
    data: { name: 'Past deadline', targetDate: utcIso(-1), color: '#16A34A', icon: 'Done' },
  })).json()).data;

  await page.getByRole('link', { name: 'Vocabulary' }).click();
  await page.getByTestId('open-countdown').click();
  await expect(page.getByRole('heading', { name: 'Past deadline' })).toBeVisible();
  await expect(page.locator('.countdown-badge').filter({ hasText: 'Completed' })).toBeVisible();
  await expect(page.getByText('Event Past deadline has arrived!')).toBeVisible();

  const second = await registerAndLogin(page, 'countdown-foreign');
  const foreign = await page.request.patch(`http://127.0.0.1:5000/api/v1/countdowns/${past.id}`, {
    headers: { Authorization: `Bearer ${second.token}` },
    data: { name: 'Foreign edit' },
  });
  expect(foreign.status()).toBe(404);
});
