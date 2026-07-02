import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Practice Learner');
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
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;

  return { headers: { Authorization: `Bearer ${token}` } };
}

async function createBoardWithWords(page, headers, boardName, pageName, words) {
  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: boardName, language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: pageName },
  })).json()).data;

  for (const word of words) {
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

  return { board, vocabPage };
}

async function listDecks(page, headers) {
  return (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
}

function reviewSnapshot(deck) {
  return [...deck.cards]
    .map((card) => ({
      word: card.word,
      reviewLevel: card.reviewLevel,
      lapseCount: card.lapseCount,
      nextReviewDate: card.nextReviewDate,
    }))
    .sort((left, right) => left.word.localeCompare(right.word));
}

async function completeMeaningToWordPractice(page) {
  await page.getByRole('button', { name: 'Sequential' }).click();
  await page.getByTestId('start-practice-session').click();

  await expect(page.getByText('1 / 2')).toBeVisible();
  await page.getByTestId('practice-answer-input').fill('wrong');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('That answer does not match yet. Try again or reveal the answer.')).toBeVisible();
  await page.getByTestId('practice-answer-input').fill('mitigate');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByTestId('practice-next-card').click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('mitigate');
  await page.getByTestId('practice-next-card').click();

  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal / skip' }).click();
  await page.getByTestId('practice-next-card').click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('nuance');
  await page.getByTestId('practice-next-card').click();

  await expect(page.getByTestId('practice-summary')).toContainText('1 words completed cleanly and 1 words needed reveal/skip');
}

test('practice completion separates Finish from Add to Review FluentA SRS creation', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const { headers } = await registerAndLogin(page, 'practice-workflow');
  await createBoardWithWords(page, headers, 'Practice Workflow Board', 'Practice Workflow Page', ['mitigate', 'nuance']);

  const initialDecks = await listDecks(page, headers);
  const pageDeck = initialDecks.find((deck) => deck.name === 'Practice Workflow Board - Practice Workflow Page');
  const initialSchedule = reviewSnapshot(pageDeck);
  expect(initialSchedule).toEqual([
    expect.objectContaining({ word: 'mitigate', reviewLevel: null, lapseCount: 0, nextReviewDate: null }),
    expect.objectContaining({ word: 'nuance', reviewLevel: null, lapseCount: 0, nextReviewDate: null }),
  ]);

  const practiceSettingsResponse = await page.request.put('http://127.0.0.1:5000/api/v1/practice/settings', {
    headers,
    data: { modeSequence: ['meaningToWord'] },
  });
  expect(practiceSettingsResponse.status()).toBe(200);

  await page.goto('/flashcards');
  const pageDeckCard = page.getByTestId(`flashcard-deck-${pageDeck.id}`);
  await expect(pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' })).toBeVisible();

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await expect(page.getByRole('heading', { name: 'Practice Workflow Board - Practice Workflow Page' })).toBeVisible();
  await expect(page.getByText('Meaning -> Word')).toBeVisible();
  await expect(page.getByText('recap', { exact: true })).toBeVisible();

  await page.getByTestId('start-practice-session').click();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await page.getByRole('link', { name: 'Back to decks' }).click();

  const afterAbandonDecks = await listDecks(page, headers);
  expect(reviewSnapshot(afterAbandonDecks.find((deck) => deck.name === pageDeck.name))).toEqual(initialSchedule);

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await completeMeaningToWordPractice(page);

  const finishSummaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/practice-sessions') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Finish' }).click();
  const finishSummaryPayload = (await (await finishSummaryResponsePromise).json()).data;
  expect(finishSummaryPayload.totalCards).toBe(2);
  expect(finishSummaryPayload.correctCards).toBe(1);
  expect(finishSummaryPayload.wrongCards).toBe(1);
  await page.getByRole('link', { name: 'Done' }).click();

  const afterFinishDecks = await listDecks(page, headers);
  expect(reviewSnapshot(afterFinishDecks.find((deck) => deck.name === pageDeck.name))).toEqual(initialSchedule);

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await completeMeaningToWordPractice(page);

  const addSummaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/practice-sessions') && response.request().method() === 'POST');
  const addToReviewResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/practice/add-to-review') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add to Review' }).click();
  await addSummaryResponsePromise;
  const addToReviewPayload = (await (await addToReviewResponsePromise).json()).data;
  expect(addToReviewPayload.addedWordCount).toBe(2);
  await expect(page.getByTestId('practice-summary')).toContainText('2 new words were added to Review');

  const afterAddDecks = await listDecks(page, headers);
  const afterAddSchedule = reviewSnapshot(afterAddDecks.find((deck) => deck.name === pageDeck.name));
  expect(afterAddSchedule).toEqual([
    expect.objectContaining({ word: 'mitigate', reviewLevel: 0, lapseCount: 0, nextReviewDate: expect.any(String) }),
    expect.objectContaining({ word: 'nuance', reviewLevel: 0, lapseCount: 0, nextReviewDate: expect.any(String) }),
  ]);

  const repeatAdd = await page.request.post('http://127.0.0.1:5000/api/v1/practice/add-to-review', {
    headers,
    data: { deckId: pageDeck.id, timeZoneId: 'UTC' },
  });
  expect(repeatAdd.status()).toBe(200);
  expect((await repeatAdd.json()).data.addedWordCount).toBe(0);

  const afterRepeatAddDecks = await listDecks(page, headers);
  expect(reviewSnapshot(afterRepeatAddDecks.find((deck) => deck.name === pageDeck.name))).toEqual(afterAddSchedule);
});
