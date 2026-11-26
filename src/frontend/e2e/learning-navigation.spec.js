import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('protected navigation exposes Vocabulary, Practice, and Review entry points', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'learning-navigation' });

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Vocabulary' })).toHaveAttribute('href', '/vocabulary');
  await expect(page.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
  await expect(page.getByRole('link', { name: 'Review', exact: true })).toHaveAttribute('href', '/review');

  await page.getByRole('link', { name: 'Practice' }).click();
  await expect(page).toHaveURL('/practice');
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page).toHaveURL('/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Vocabulary', exact: true }).click();
  await expect(page).toHaveURL('/vocabulary');
  await expect(page.getByRole('heading', { name: 'Vocabulary', exact: true })).toBeVisible();
});
