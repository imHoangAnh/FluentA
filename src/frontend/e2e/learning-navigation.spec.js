import { expect, test } from '@playwright/test';

test('protected navigation exposes separate Flashcard, Practice, and Review entry points', async ({ page }) => {
  const email = `learning-nav+${Date.now()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Learning Nav Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await expect(page.getByRole('link', { name: 'Flashcard' })).toHaveAttribute('href', '/flashcards');
  await expect(page.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
  await expect(page.getByRole('link', { name: 'Review', exact: true })).toHaveAttribute('href', '/review');

  await page.getByRole('link', { name: 'Practice' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/practice');
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Flashcard', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  await expect(page.getByRole('heading', { name: 'Your pages' })).toBeVisible();
});
