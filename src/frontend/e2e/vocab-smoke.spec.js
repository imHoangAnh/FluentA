import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('board, page, and vocabulary word CRUD smoke', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'vocab-smoke' });
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('IELTS Browser Board');
  await page.getByTestId('create-board-button').click();
  await expect(page.getByRole('button', { name: /IELTS Browser Board/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create your first page' })).toBeVisible();

  await page.getByRole('button', { name: 'Create page' }).click();
  await page.getByTestId('page-name-input').fill('Unit 1 - Education');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByRole('button', { name: 'Unit 1 - Education', exact: true })).toBeVisible();

  await page.getByLabel('New word', { exact: true }).fill('mitigate');
  await page.getByLabel('New Vietnamese meaning', { exact: true }).fill('giảm nhẹ');
  await page.getByLabel('New IPA pronunciation', { exact: true }).fill('/ˈmɪt.ɪ.ɡeɪt/');
  await page.getByLabel('New definition', { exact: true }).fill('make less severe');
  await page.getByLabel('New word class', { exact: true }).click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('New example', { exact: true }).fill('Mitigate the risk.');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Word for mitigate')).toBeVisible();

  await page.getByLabel('Word for mitigate').fill('mitigation');
  await page.getByLabel('Word for mitigate').press('Tab');
  await expect(page.getByLabel('Word for mitigation')).toBeVisible();
  await page.getByLabel('Class for mitigation').click();
  await page.getByRole('option', { name: 'Noun', exact: true }).click();
  await page.getByLabel('Class for mitigation').press('Tab');

  await page.getByLabel('Delete mitigation').click();
  await expect(page.getByLabel('Word for mitigation')).toBeHidden();

  await page.getByRole('button', { name: 'Unit 1 - Education', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete Page' }).click();
  await expect(page.getByRole('button', { name: 'Unit 1 - Education', exact: true })).toBeHidden();
});
