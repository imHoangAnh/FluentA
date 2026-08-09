import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('protected navigation exposes separate Flashcard, Practice, and Review entry points', async ({ page }) => {
  await loginSeededUser(page, { prefix: 'learning-navigation' });

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Flashcard' })).toHaveAttribute('href', '/flashcards');
  await expect(page.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
  await expect(page.getByRole('link', { name: 'Review', exact: true })).toHaveAttribute('href', '/review');

  await page.getByRole('link', { name: 'Practice' }).click();
  await expect(page).toHaveURL('/practice');
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page).toHaveURL('/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Flashcard', exact: true }).click();
  await expect(page).toHaveURL('/flashcards');
  await expect(page.getByRole('heading', { name: 'Flashcards', exact: true })).toBeVisible();
});
