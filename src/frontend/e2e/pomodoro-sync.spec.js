import { expect, test } from '@playwright/test';

async function registerAndLogin(page) {
  const email = `pomodoro-sync+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Pomodoro Sync Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await login(page, email, password);
  return { email, password };
}

async function login(page, email, password) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('Pomodoro timer controls sync across same-user tabs', async ({ context, page }) => {
  const consoleErrors = [];
  const collectConsoleError = (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  };
  page.on('console', collectConsoleError);

  const { email, password } = await registerAndLogin(page);
  await page.getByRole('link', { name: 'Pomodoro' }).click();
  await expect(page.getByTestId('pomodoro-state')).toHaveText('Idle');

  const secondTab = await context.newPage();
  secondTab.on('console', collectConsoleError);
  const secondTabHubSockets = [];
  secondTab.on('websocket', (socket) => {
    if (socket.url().includes('/hubs/sync')) secondTabHubSockets.push(socket.url());
  });
  await login(secondTab, email, password);
  await secondTab.getByRole('link', { name: 'Pomodoro' }).click();
  await expect(secondTab.getByTestId('pomodoro-state')).toHaveText('Idle');
  await expect.poll(() => secondTabHubSockets.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(4);

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(secondTab.getByTestId('pomodoro-state')).toHaveText('Running');

  await secondTab.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByTestId('pomodoro-state')).toHaveText('Paused');

  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(secondTab.getByTestId('pomodoro-state')).toHaveText('Running');

  await secondTab.getByRole('button', { name: 'Complete phase', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Short Break' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(secondTab.getByTestId('pomodoro-state')).toHaveText('Idle');
  expect(consoleErrors).toEqual([]);
});
