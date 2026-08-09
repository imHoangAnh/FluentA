import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('Chinese board adapts vocabulary and review labels to Pinyin', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'vocab-multilanguage' });
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('HSK Board');
  await page.getByTestId('board-language-select').click();
  await page.getByRole('option', { name: 'Chinese', exact: true }).click();
  await page.getByTestId('create-board-button').click();
  await expect(page.getByRole('button', { name: 'HSK Board' })).toBeVisible();
});
