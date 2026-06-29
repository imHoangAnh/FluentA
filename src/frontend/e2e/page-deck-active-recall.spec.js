import { expect, test } from '@playwright/test';

test('Page Deck Active Recall supports keyboard review, TTS, abandonment, summary, and dedicated review-state progression', async ({ page }) => {
  await page.addInitScript(() => {
    window.__spokenWords = [];
    window.speechSynthesis.speak = (utterance) => window.__spokenWords.push({ text: utterance.text, lang: utterance.lang });
    window.speechSynthesis.cancel = () => undefined;
  });

  const email = `active-recall+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Active Recall Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;

  const headers = { Authorization: `Bearer ${token}` };
  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: 'Recall Board', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Recall Page' },
  })).json()).data;

  for (const word of ['mitigate', 'coherent', 'resilient', 'nuance']) {
    await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
      headers,
      data: {
        word,
        meaningVn: `${word} vn`,
        meaningEn: `${word} definition`,
        class: 'other',
        example: `${word} example.`,
      },
    });
  }

  const seededPractice = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/practice-sessions', {
    headers,
    data: {
      deckId: (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data[0].id,
      mode: 'dictation',
      totalCards: 4,
      correctCards: 4,
      wrongCards: 0,
      timeZoneId: 'UTC',
    },
  });
  expect(seededPractice.status()).toBe(200);

  await page.goto('http://127.0.0.1:5173/flashcards');
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  await expect(page.getByText('Recall Board - Recall Page')).toBeVisible();
  const pageDeck = page.locator('article.flashcard-deck').filter({ hasText: 'Recall Board - Recall Page' });
  await pageDeck.getByRole('link', { name: 'Study this Page Deck' }).click();

  await expect(page.getByRole('heading', { name: 'Recall Board - Recall Page' })).toBeVisible();
  await page.getByRole('button', { name: /Shuffle/ }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 4')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__spokenWords.length)).toBeGreaterThan(0);

  await page.keyboard.press('Space');
  await expect(page.getByTestId('review-answer')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText('2 / 4')).toBeVisible();

  await page.getByRole('link', { name: 'Leave session' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  await pageDeck.getByRole('link', { name: 'Study this Page Deck' }).click();
  const sessionResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/sessions') && response.request().method() === 'POST'
  );
  await page.getByTestId('start-review-session').click();
  const sessionId = (await (await sessionResponsePromise).json()).data.sessionId;
  await expect(page.getByText('1 / 4')).toBeVisible();
  await expect(page.getByTestId('review-answer')).toBeHidden();

  for (const [index, ratingKey] of ['1', '2', '3', '4'].entries()) {
    await page.keyboard.press('Space');
    await expect(page.getByTestId('review-answer')).toBeVisible();
    await page.keyboard.press(ratingKey);
    if (index < 3) {
      await expect(page.getByText(`${index + 2} / 4`)).toBeVisible();
    }
  }

  await expect(page.getByTestId('review-summary')).toBeVisible();
  await expect(page.getByText('4 cards reviewed')).toBeVisible();
  await expect(page.getByTestId('review-summary').getByText('Easy')).toBeVisible();
  await expect(page.getByTestId('review-summary').getByText('Good')).toBeVisible();
  await expect(page.getByTestId('review-summary').getByText('Hard')).toBeVisible();
  await expect(page.getByTestId('review-summary').getByText('Again')).toBeVisible();

  const sessionSummary = await page.request.get(`http://127.0.0.1:5000/api/v1/flashcards/sessions/${sessionId}/summary`, { headers });
  expect(sessionSummary.status()).toBe(200);
  const sessionSummaryPayload = (await sessionSummary.json()).data;
  expect(sessionSummaryPayload.totalCardsReviewed).toBe(4);
  expect(sessionSummaryPayload.easy).toBe(1);
  expect(sessionSummaryPayload.good).toBe(1);
  expect(sessionSummaryPayload.hard).toBe(1);
  expect(sessionSummaryPayload.again).toBe(1);

  const decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  const pageDeckCard = decks.find((deck) => deck.type === 'PageDeck').cards[0];
  const beforeSchedule = {
    interval: pageDeckCard.interval,
    easeFactor: pageDeckCard.easeFactor,
    repetitions: pageDeckCard.repetitions,
    nextReviewDate: pageDeckCard.nextReviewDate,
    state: pageDeckCard.state,
  };
  expect(beforeSchedule.state).not.toBe('new');
  expect(beforeSchedule.repetitions).toBeGreaterThanOrEqual(1);
  expect(beforeSchedule.interval).toBeGreaterThanOrEqual(1);
  const recorded = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/review', {
    headers,
    data: { sessionId: crypto.randomUUID(), cardId: pageDeckCard.id, rating: 2, timeSpentSeconds: 1, timeZoneId: 'UTC' },
  });
  expect(recorded.status()).toBe(200);

  const refreshedDecks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  const refreshedCard = refreshedDecks.find((deck) => deck.type === 'PageDeck').cards[0];
  expect({
    interval: refreshedCard.interval,
    easeFactor: refreshedCard.easeFactor,
    repetitions: refreshedCard.repetitions,
    nextReviewDate: refreshedCard.nextReviewDate,
    state: refreshedCard.state,
  }).not.toEqual(beforeSchedule);
  expect(refreshedCard.repetitions).toBeGreaterThanOrEqual(beforeSchedule.repetitions);
  expect(refreshedCard.nextReviewDate).not.toBe(beforeSchedule.nextReviewDate);
});
