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

  await page.getByLabel('Word for new word').fill('mitigate');
  await page.getByLabel('Meaning for new word').fill('giảm nhẹ');
  await page.getByLabel('IPA for new word').fill('/ˈmɪt.ɪ.ɡeɪt/');
  await page.getByLabel('Context for new word').fill('used to describe making something less severe');
  await page.getByLabel('Type for new word').click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('Example for new word').fill('Mitigate the risk.');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Word for word')).toBeVisible();

  await page.getByLabel('Word for word').fill('mitigation');
  await page.getByLabel('Word for word').press('Tab');
  await expect(page.getByLabel('Word for word')).toBeVisible();
  await page.getByLabel('Type for word').click();
  await page.getByRole('option', { name: 'Noun', exact: true }).click();
  await page.getByLabel('Type for word').press('Tab');

  await page.getByLabel('Delete mitigation').click();
  await expect(page.getByLabel('Word for word')).toBeHidden();

  await page.getByRole('button', { name: 'Unit 1 - Education', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete Page' }).click();
  await expect(page.getByRole('button', { name: 'Unit 1 - Education', exact: true })).toBeHidden();
});
