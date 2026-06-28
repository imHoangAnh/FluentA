import { expect, test } from '@playwright/test';

async function registerAndLogin(page) {
  const email = `pomodoro-config+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Pomodoro Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('Pomodoro config persists and current state uses configured work duration', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  await registerAndLogin(page);
  await page.getByTestId('open-pomodoro').click();

  await expect(page.getByRole('heading', { name: 'Focus timer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Idle' })).toBeVisible();
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('25:00');

  await page.getByTestId('pomodoro-work-input').fill('30');
  await page.getByTestId('pomodoro-short-break-input').fill('7');
  await page.getByTestId('pomodoro-long-break-input').fill('20');
  await page.getByTestId('pomodoro-long-after-input').fill('3');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Pomodoro settings saved.')).toBeVisible();
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('30:00');

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByTestId('open-pomodoro').click();
  await expect(page.getByTestId('pomodoro-work-input')).toHaveValue('30');
  await expect(page.getByTestId('pomodoro-short-break-input')).toHaveValue('7');
  await expect(page.getByTestId('pomodoro-long-break-input')).toHaveValue('20');
  await expect(page.getByTestId('pomodoro-long-after-input')).toHaveValue('3');
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('30:00');
  expect(consoleErrors).toEqual([]);
});
