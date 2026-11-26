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

  await page.getByLabel('Word for new word').fill('mitigate');
  await page.getByLabel('Meaning for new word').fill('giảm nhẹ');
  await page.getByLabel('IPA for new word').fill('/ˈmɪt.ɪ.ɡeɪt/');
  await page.getByLabel('Context for new word').fill('used to describe making a risk less severe');
  await page.getByLabel('Type for new word').click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('Example for new word').fill('Mitigate risk.');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Word for word')).toBeVisible();

  await page.getByLabel('Word for word').fill('mitigation');
  await page.getByLabel('Word for word').press('Tab');
  await expect(page.getByLabel('Meaning for word')).toBeFocused();
  await page.getByLabel('Meaning for word').press('Shift+Tab');
  await expect(page.getByLabel('Word for word')).toBeFocused();

  await page.getByLabel('Meaning for word').fill('discard me');
  await page.getByLabel('Meaning for word').press('Escape');
  await expect(page.getByLabel('Meaning for word')).toHaveValue('giảm nhẹ');

  await page.getByLabel('Antonyms for word').press('Enter');
  await expect(page.getByLabel('Word for new word')).toBeFocused();

  let failNextCellSave = true;
  await page.route('**/api/v1/vocabs/words/*', async (route) => {
    if (failNextCellSave) {
      failNextCellSave = false;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false }) });
      return;
    }
    await route.continue();
  });
  await page.getByLabel('Context for word').fill('used to describe reduction of harm');
  await page.getByLabel('Context for word').press('Tab');
  await expect(page.getByText('Save failed.')).toBeVisible();
  await expect(page.getByLabel('Context for word')).toHaveValue('used to describe reduction of harm');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Save failed.')).toBeHidden();
  await expect(page.getByLabel('Context for word')).toHaveValue('used to describe reduction of harm');

  await page.getByLabel('Word for new word').fill('retain');
  await page.getByLabel('Meaning for new word').fill('giữ lại');
  await page.getByLabel('IPA for new word').fill('/rɪˈteɪn/');
  await page.getByLabel('Context for new word').fill('used to describe continuing to have something');
  await page.getByLabel('Type for new word').click();
  await page.getByRole('option', { name: 'Verb', exact: true }).click();
  await page.getByLabel('Example for new word').fill('Retain the value.');
  await page.getByLabel('Antonyms for new word').press('Enter');
  await expect(page.getByLabel('Word for word')).toBeVisible();
  await expect(page.getByLabel('Word for new word')).toBeFocused();
});

