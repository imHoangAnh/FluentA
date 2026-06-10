import { expect, test } from '@playwright/test';

test('Page Deck Active Recall supports keyboard review, TTS, abandonment, and summary', async ({ page }) => {
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
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
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

  await page.getByTestId('open-flashcards').click();
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
  await page.getByTestId('start-review-session').click();
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

  const decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  const allWordsCard = decks.find((deck) => deck.type === 'AllWords').cards[0];
  const rejected = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/review', {
    headers,
    data: { sessionId: crypto.randomUUID(), cardId: allWordsCard.id, rating: 2, timeSpentSeconds: 1, timeZoneId: 'UTC' },
  });
  expect(rejected.status()).toBe(200);
});
