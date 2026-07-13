import { expect, test } from '@playwright/test';

test('board-wide custom columns, visibility, typed values, and permanent deletion', async ({ page }) => {
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
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('Custom Columns Board');
  await page.getByTestId('create-board-button').click();
  await page.getByTestId('page-name-input').fill('Page One');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByLabel('Rename Page One')).toBeVisible();
  await page.getByTestId('page-name-input').fill('Page Two');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByLabel('Rename Page Two')).toBeVisible();

  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByLabel('Custom column name').fill('Register');
  await page.getByRole('button', { name: 'Add column' }).click();
  await expect(page.getByRole('checkbox', { name: /Register/ })).toBeVisible();
  await page.getByLabel('Custom column name').fill('Priority');
  await page.getByLabel('Custom column type').selectOption('number');
  await page.getByRole('button', { name: 'Add column' }).click();
  await expect(page.getByRole('checkbox', { name: /Priority/ })).toBeVisible();
  await page.getByRole('button', { name: 'Columns', exact: true }).click();

  await expect(page.getByLabel('New Register')).toBeVisible();
  await expect(page.getByLabel('New Priority')).toHaveAttribute('type', 'number');
  await page.getByLabel('New word', { exact: true }).fill('mitigate');
  await page.getByLabel('New Vietnamese meaning', { exact: true }).fill('giảm nhẹ');
  await page.getByLabel('New English meaning', { exact: true }).fill('make less severe');
  await page.getByLabel('New example', { exact: true }).fill('Mitigate risk.');
  await page.getByLabel('New Register').fill('formal');
  await page.getByLabel('New Priority').fill('3.5');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Register for mitigate')).toHaveValue('formal');
  await expect(page.getByLabel('Priority for mitigate')).toHaveValue('3.5');

  await page.getByRole('button', { name: 'Page Two', exact: true }).click();
  await expect(page.getByLabel('New Register')).toBeVisible();
  await expect(page.getByLabel('New Priority')).toBeVisible();

  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByRole('checkbox', { name: /Note/ }).click();
  await expect(page.getByLabel('New note')).toBeHidden();
  await page.getByRole('checkbox', { name: /Priority/ }).click();
  await expect(page.getByLabel('New Priority')).toBeHidden();
  await page.getByRole('checkbox', { name: /Priority/ }).click();
  await expect(page.getByLabel('New Priority')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete custom column Register').click();
  await expect(page.getByLabel('New Register')).toBeHidden();
  await expect(page.getByRole('checkbox', { name: /Register/ })).toBeHidden();
});
