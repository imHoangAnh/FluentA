import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'pomodoro-sync' });
  return identity;
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('/');
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

