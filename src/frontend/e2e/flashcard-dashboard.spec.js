import { expect, test } from '@playwright/test';

test('flashcard dashboard shows streak, retention, due counts, and forecast', async ({ page }) => {
  const email = `dashboard+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Dashboard Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: 'Dashboard Board', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Dashboard Page' },
  })).json()).data;
  await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
    headers,
    data: {
      word: 'forecast',
      meaningVn: 'du bao',
      meaningEn: 'prediction',
      class: 'noun',
      example: 'The forecast is useful.',
    },
  });

  await page.getByTestId('open-flashcards').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  await expect(page.getByTestId('dashboard-due')).toContainText('0 overdue · 1 new');
  await expect(page.getByTestId('dashboard-forecast')).toBeVisible();

  const pageDeck = page.locator('article.flashcard-deck').filter({ hasText: 'Dashboard Board - Dashboard Page' });
  await pageDeck.getByRole('link', { name: 'Study this Page Deck' }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('1');
  await expect(page.getByTestId('review-summary')).toBeVisible();
  await page.getByRole('link', { name: 'Done' }).click();

  await expect(page.getByTestId('dashboard-streak')).toContainText('1 day');
  await expect(page.getByTestId('dashboard-retention')).toContainText('100%');
});
