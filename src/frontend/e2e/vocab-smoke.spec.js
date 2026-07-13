import { expect, test } from '@playwright/test';

test('board, page, and vocabulary word CRUD smoke', async ({ page }) => {
  const email = `boardpage+${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Board Page Learner');
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

  await page.getByTestId('board-name-input').fill('IELTS Browser Board');
  await page.getByTestId('create-board-button').click();
  await expect(page.getByRole('heading', { name: 'IELTS Browser Board' })).toBeVisible();

  await page.getByTestId('page-name-input').fill('Unit 1 - Education');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByLabel('Rename Unit 1 - Education')).toBeVisible();

  await page.getByLabel('Rename Unit 1 - Education').fill('Unit 1 - Learning');
  await page.locator('button[data-testid^="save-page-"]').click();
  await expect(page.getByLabel('Rename Unit 1 - Learning')).toBeVisible();

  await page.getByLabel('New word', { exact: true }).fill('mitigate');
  await page.getByLabel('New Vietnamese meaning', { exact: true }).fill('giảm nhẹ');
  await page.getByLabel('New English meaning', { exact: true }).fill('make less severe');
  await page.getByLabel('New word class', { exact: true }).selectOption('verb');
  await page.getByLabel('New example', { exact: true }).fill('Mitigate the risk.');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Word for mitigate')).toBeVisible();

  await page.getByLabel('Word for mitigate').fill('mitigation');
  await page.getByLabel('Word for mitigate').press('Tab');
  await expect(page.getByLabel('Word for mitigation')).toBeVisible();
  await page.getByLabel('Class for mitigation').selectOption('noun');
  await page.getByLabel('Class for mitigation').press('Tab');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete mitigation').click();
  await expect(page.getByLabel('Word mitigation')).toBeHidden();

  await page.locator('button[data-testid^="delete-page-"]').click();
  await expect(page.getByLabel('Rename Unit 1 - Learning')).toBeHidden();
});
