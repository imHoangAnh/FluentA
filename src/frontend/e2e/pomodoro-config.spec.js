import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'pomodoro-config' });
  return identity;
}

test('Pomodoro config persists and current state uses configured work duration', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  await registerAndLogin(page);
  await page.getByRole('link', { name: 'Pomodoro' }).click();

  await expect(page.getByRole('button', { name: 'Pomo' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pomodoro-state')).toHaveText('Idle');
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('25:00');

  await page.getByRole('button', { name: 'Open configuration' }).click();
  await page.getByTestId('pomodoro-work-input').fill('30');
  await page.getByTestId('pomodoro-short-break-input').fill('7');
  await page.getByTestId('pomodoro-long-break-input').fill('20');
  await page.getByTestId('pomodoro-long-after-input').fill('3');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog', { name: 'Configuration' })).toBeHidden();
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('30:00');

  await page.getByRole('link', { name: 'Go to overview' }).click();
  await page.getByRole('link', { name: 'Pomodoro' }).click();
  await page.getByRole('button', { name: 'Open configuration' }).click();
  await expect(page.getByTestId('pomodoro-work-input')).toHaveValue('30');
  await expect(page.getByTestId('pomodoro-short-break-input')).toHaveValue('7');
  await expect(page.getByTestId('pomodoro-long-break-input')).toHaveValue('20');
  await expect(page.getByTestId('pomodoro-long-after-input')).toHaveValue('3');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('30:00');
  expect(consoleErrors).toEqual([]);
});

