import { expect, test } from '@playwright/test';

test('All Words Normal and Shuffle reviews update SM-2 scheduling', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const email = `all-words-sm2+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('SM2 Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: 'SM2 Board', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'SM2 Page' },
  })).json()).data;
  await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
    headers,
    data: {
      word: 'retention',
      meaningVn: 'su ghi nho',
      meaningEn: 'continued possession of knowledge',
      class: 'noun',
      example: 'Active recall improves retention.',
    },
  });

  await page.getByTestId('open-flashcards').click();
  const allWordsDeck = page.locator('article.flashcard-deck').filter({ hasText: 'SM2 Board - All Words' });
  await allWordsDeck.getByRole('link', { name: 'Study All Words' }).click();
  await expect(page.getByText('All Words SM-2 Review')).toBeVisible();
  await expect(page.getByText(/Every rating updates/)).toBeVisible();

  await page.getByRole('button', { name: /Normal/ }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(page.getByTestId('review-summary')).toBeVisible();

  let decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  let card = decks.find((deck) => deck.type === 'AllWords').cards[0];
  expect(card.interval).toBe(1);
  expect(card.repetitions).toBe(1);
  expect(card.state).toBe('learning');
  expect(card.nextReviewDate).toBeTruthy();

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(allWordsDeck.getByText('1 reviews')).toBeVisible();
  await expect(allWordsDeck.getByText('learning', { exact: true })).toBeVisible();
  await allWordsDeck.getByRole('link', { name: 'Study All Words' }).click();
  await page.getByRole('button', { name: /Shuffle/ }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(page.getByTestId('review-summary')).toBeVisible();

  decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  card = decks.find((deck) => deck.type === 'AllWords').cards[0];
  expect(card.interval).toBe(6);
  expect(card.repetitions).toBe(2);
  expect(card.state).toBe('learning');

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(allWordsDeck.getByText('2 reviews')).toBeVisible();
});
