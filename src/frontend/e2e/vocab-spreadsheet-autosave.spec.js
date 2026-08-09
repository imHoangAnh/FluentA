import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('spreadsheet keyboard autosave preserves failed drafts and retries', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'vocab-spreadsheet-autosave' });
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('Spreadsheet Board');
  await page.getByTestId('create-board-button').click();
  await page.getByRole('button', { name: 'Create page' }).click();
  await page.getByTestId('page-name-input').fill('Unit One');
  await page.getByTestId('create-page-button').click();

  await page.getByLabel('New word', { exact: true }).fill('mitigate');
  await page.getByLabel('New Vietnamese meaning').fill('giảm nhẹ');
  await page.getByLabel('New IPA pronunciation').fill('/ˈmɪt.ɪ.ɡeɪt/');
  await page.getByLabel('New definition').fill('make less severe');
  await page.getByLabel('New word class').click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('New example').fill('Mitigate risk.');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Word for mitigate')).toBeVisible();

  await page.getByLabel('Word for mitigate').fill('mitigation');
  await page.getByLabel('Word for mitigate').press('Tab');
  await expect(page.getByLabel('Vietnamese meaning for mitigation')).toBeFocused();
  await page.getByLabel('Vietnamese meaning for mitigation').press('Shift+Tab');
  await expect(page.getByLabel('Word for mitigation')).toBeFocused();

  await page.getByLabel('Vietnamese meaning for mitigation').fill('discard me');
  await page.getByLabel('Vietnamese meaning for mitigation').press('Escape');
  await expect(page.getByLabel('Vietnamese meaning for mitigation')).toHaveValue('giảm nhẹ');

  await page.getByLabel('Antonyms for mitigation').press('Enter');
  await expect(page.getByLabel('New word', { exact: true })).toBeFocused();

  let failNextCellSave = true;
  await page.route('**/api/v1/boards/*/words/*/cells', async (route) => {
    if (failNextCellSave) {
      failNextCellSave = false;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false }) });
      return;
    }
    await route.continue();
  });
  await page.getByLabel('Definition for mitigation').fill('reduction of harm');
  await page.getByLabel('Definition for mitigation').press('Tab');
  await expect(page.getByText('Save failed.')).toBeVisible();
  await expect(page.getByLabel('Definition for mitigation')).toHaveValue('reduction of harm');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Save failed.')).toBeHidden();
  await expect(page.getByLabel('Definition for mitigation')).toHaveValue('reduction of harm');

  await page.getByLabel('New word', { exact: true }).fill('retain');
  await page.getByLabel('New Vietnamese meaning').fill('giữ lại');
  await page.getByLabel('New IPA pronunciation').fill('/rɪˈteɪn/');
  await page.getByLabel('New definition').fill('continue to have');
  await page.getByLabel('New word class').click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('New example').fill('Retain the value.');
  await page.getByLabel('New antonyms').press('Enter');
  await expect(page.getByLabel('Word for retain')).toBeVisible();
  await expect(page.getByLabel('New word', { exact: true })).toBeFocused();
});

