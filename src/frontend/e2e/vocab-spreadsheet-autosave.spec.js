import { expect, test } from '@playwright/test';

test('spreadsheet keyboard autosave preserves failed drafts and retries', async ({ page }) => {
  const email = `spreadsheet+${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Spreadsheet Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('Spreadsheet Board');
  await page.getByTestId('create-board-button').click();
  await page.getByTestId('page-name-input').fill('Unit One');
  await page.getByTestId('create-page-button').click();

  await page.getByLabel('New word', { exact: true }).fill('mitigate');
  await page.getByLabel('New Vietnamese meaning').fill('giảm nhẹ');
  await page.getByLabel('New English meaning').fill('make less severe');
  await page.getByLabel('New word class').selectOption('verb');
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

  await page.getByLabel('Note for mitigation').press('Enter');
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
  await page.getByLabel('English meaning for mitigation').fill('reduction of harm');
  await page.getByLabel('English meaning for mitigation').press('Tab');
  await expect(page.getByText('Save failed.')).toBeVisible();
  await expect(page.getByLabel('English meaning for mitigation')).toHaveValue('reduction of harm');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Save failed.')).toBeHidden();
  await expect(page.getByLabel('English meaning for mitigation')).toHaveValue('reduction of harm');

  await page.getByLabel('New word', { exact: true }).fill('retain');
  await page.getByLabel('New Vietnamese meaning').fill('giữ lại');
  await page.getByLabel('New English meaning').fill('continue to have');
  await page.getByLabel('New word class').selectOption('verb');
  await page.getByLabel('New example').fill('Retain the value.');
  await page.getByLabel('New note').press('Enter');
  await expect(page.getByLabel('Word for retain')).toBeVisible();
  await expect(page.getByLabel('New word', { exact: true })).toBeFocused();
});
