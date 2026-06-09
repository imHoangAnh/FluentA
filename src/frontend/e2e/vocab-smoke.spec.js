import { expect, test } from '@playwright/test';

test('board and page management smoke', async ({ page }) => {
  const email = `boardpage+${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Board Page Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('SecurePass123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('SecurePass123');
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

  await page.locator('button[data-testid^="delete-page-"]').click();
  await expect(page.getByLabel('Rename Unit 1 - Learning')).toBeHidden();
});
