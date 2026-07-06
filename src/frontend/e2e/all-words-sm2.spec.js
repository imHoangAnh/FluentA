import { expect, test } from '@playwright/test';

test('Page Deck Normal and Shuffle reviews advance dedicated review state', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const email = `page-deck-review+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('SM2 Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
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
  const seededDecks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  const seededDeck = seededDecks.find((deck) => deck.type === 'PageDeck');
  const seededPractice = await page.request.post('http://127.0.0.1:5000/api/v1/practice/sessions', {
    headers,
    data: {
      deckId: seededDeck.id,
      mode: 'dictation',
      totalCards: 1,
      correctCards: 1,
      wrongCards: 0,
      timeZoneId: 'UTC',
    },
  });
  expect(seededPractice.status()).toBe(200);

  await page.goto('http://127.0.0.1:5173/flashcards');
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  const pageDeck = page.locator('article.flashcard-deck').filter({ hasText: 'SM2 Board - SM2 Page' });
  await pageDeck.getByRole('link', { name: 'Study this Page Deck' }).click();
  await expect(page.getByText('Page Deck Active Recall')).toBeVisible();
  await expect(page.getByText(/choose an order/i)).toBeVisible();

  let decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  let card = decks.find((deck) => deck.type === 'PageDeck').cards[0];
  const initialSchedule = {
    interval: card.interval,
    repetitions: card.repetitions,
    state: card.state,
    nextReviewDate: card.nextReviewDate,
  };
  expect(initialSchedule).toEqual(expect.objectContaining({
    interval: 1,
    repetitions: 1,
    state: 'learning',
  }));

  await page.getByRole('button', { name: /Normal/ }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(page.getByTestId('review-summary')).toBeVisible();

  decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  card = decks.find((deck) => deck.type === 'PageDeck').cards[0];
  expect({
    interval: card.interval,
    repetitions: card.repetitions,
    state: card.state,
    nextReviewDate: card.nextReviewDate,
  }).not.toEqual(initialSchedule);

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(pageDeck.getByText('1 reviews')).toBeVisible();
  await expect(pageDeck.locator('.card-state')).toContainText(/review|mature|learning/i);
  await pageDeck.getByRole('link', { name: 'Study this Page Deck' }).click();
  await page.getByRole('button', { name: /Shuffle/ }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(page.getByTestId('review-summary')).toBeVisible();

  decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  card = decks.find((deck) => deck.type === 'PageDeck').cards[0];
  expect({
    interval: card.interval,
    repetitions: card.repetitions,
    state: card.state,
    nextReviewDate: card.nextReviewDate,
  }).not.toEqual(initialSchedule);

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(pageDeck.getByText('2 reviews')).toBeVisible();
});
