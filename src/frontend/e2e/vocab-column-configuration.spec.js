import { expect, test } from '@playwright/test';

test('board-wide optional column visibility persists across pages', async ({ page }) => {
  const email = `columns+${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Column Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/vocabulary');
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
