import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndOpenPomodoro(page) {
  const identity = await loginSeededUser(page, { prefix: 'pomodoro-history' });
  await page.getByRole('link', { name: 'Pomodoro' }).click();
  await expect(page.getByRole('button', { name: 'Pomo' })).toHaveAttribute('aria-pressed', 'true');
  return identity;
}

test('completed work sessions update today count and schedule configured long break', async ({ page }) => {
  await registerAndOpenPomodoro(page)

  await page.getByRole('button', { name: 'Open configuration' }).click()
  await page.getByTestId('pomodoro-long-after-input').fill('2')
  await page.getByTestId('pomodoro-long-break-input').fill('20')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog', { name: 'Configuration' })).toBeHidden()

  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('0')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Complete phase' }).click()
  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('1')
  await expect(page.getByRole('heading', { name: 'Short Break' })).toBeVisible()

  await page.getByRole('button', { name: 'Complete phase' }).click()
  await page.getByRole('button', { name: 'Complete phase' }).click()
  await expect(page.getByTestId('pomodoro-today-count-value')).toHaveText('2')
  await expect(page.getByRole('heading', { name: 'Long Break' })).toBeVisible()
  await expect(page.getByTestId('pomodoro-current-time')).toHaveText('20:00')
})

