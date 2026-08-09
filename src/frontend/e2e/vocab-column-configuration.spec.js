import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('board-wide optional column visibility persists across pages', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'vocab-column-configuration' });
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('Column Visibility Board');
  await page.getByTestId('create-board-button').click();
  await page.getByRole('button', { name: 'Create page' }).click();
  await page.getByTestId('page-name-input').fill('Page One');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByRole('button', { name: 'Page One', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add page' }).click();
  await page.getByTestId('page-name-input').fill('Page Two');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByRole('button', { name: 'Page Two', exact: true })).toBeVisible();

  await expect(page.getByLabel('New definition')).toBeVisible();
  await expect(page.getByLabel('New note')).toBeVisible();
  await page.getByRole('button', { name: 'Setting Columns' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Definition' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Note' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('New definition')).toBeHidden();
  await expect(page.getByLabel('New note')).toBeHidden();

  await page.getByRole('button', { name: 'Page One', exact: true }).click();
  await expect(page.getByLabel('New definition')).toBeHidden();
  await expect(page.getByLabel('New note')).toBeHidden();

  await page.getByRole('button', { name: 'Setting Columns' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Definition' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Note' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('New definition')).toBeVisible();
  await expect(page.getByLabel('New note')).toBeVisible();
});

