import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Practice Learner');
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
  return { email, password, token, headers: { Authorization: `Bearer ${token}` } };
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

function scheduleSnapshot(deck) {
  return [...deck.cards]
    .map((card) => ({
      word: card.word,
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      nextReviewDate: card.nextReviewDate,
      state: card.state,
    }))
    .sort((left, right) => left.word.localeCompare(right.word));
}

test('practice modes persist summaries and reset dedicated review state', async ({ page }) => {
  await page.addInitScript(() => {
    window.__practiceTranscripts = [];
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;

    class FakeSpeechRecognition {
      constructor() {
        this.lang = 'en-US';
        this.interimResults = false;
        this.maxAlternatives = 1;
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      }

      start() {
        const transcript = window.__practiceTranscripts.shift() ?? '';
        setTimeout(() => {
          if (transcript === '__error__') {
            this.onerror?.({ error: 'no-speech' });
            this.onend?.();
            return;
          }

          this.onresult?.({ results: [[{ transcript }]] });
          this.onend?.();
        }, 0);
      }

      stop() {
        this.onend?.();
      }
    }

    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
  });

  const { headers } = await registerAndLogin(page, 'flashcard-practice');
  await createBoardWithWords(page, headers, 'Practice Board', 'Practice Page', ['mitigate', 'nuance']);

  const decksBefore = await listDecks(page, headers);
  const pageDeckBefore = decksBefore.find((deck) => deck.name === 'Practice Board - Practice Page');

  expect(pageDeckBefore).toBeTruthy();

  const pageDeckScheduleBefore = scheduleSnapshot(pageDeckBefore);

  await page.goto('http://127.0.0.1:5173/flashcards');
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');

  const pageDeckCard = page.locator('article.flashcard-deck').filter({ hasText: 'Practice Board - Practice Page' });
  await expect(pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' })).toBeVisible();

  const dictationSummaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/practice-sessions') && response.request().method() === 'POST');

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await page.getByTestId('practice-mode-dictation').click();
  await page.getByTestId('start-practice-session').click();
  await expect(page.getByText('1 / 2')).toBeVisible();

  await page.getByTestId('practice-answer-input').fill('wrong');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('That spelling does not match yet. Try again or reveal the answer.')).toBeVisible();
  await expect(page.getByText('1 / 2')).toBeVisible();

  await page.getByTestId('practice-answer-input').fill('mitigate');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByTestId('practice-next-card').click();
  await expect(page.getByText('2 / 2')).toBeVisible();

  await page.getByRole('button', { name: 'Reveal / skip' }).click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('nuance');
  await page.getByTestId('practice-next-card').click();

  const dictationSummaryPayload = (await (await dictationSummaryResponsePromise).json()).data;
  expect(dictationSummaryPayload.mode).toBe('dictation');
  expect(dictationSummaryPayload.totalCards).toBe(2);
  expect(dictationSummaryPayload.correctCards).toBe(1);
  expect(dictationSummaryPayload.wrongCards).toBe(1);
  await expect(page.getByTestId('practice-summary')).toContainText('1 correct and 1 wrong across 2 cards');
  await page.getByRole('link', { name: 'Done' }).click();

  const decksAfterPagePractice = await listDecks(page, headers);
  const afterPagePractice = scheduleSnapshot(decksAfterPagePractice.find((deck) => deck.name === 'Practice Board - Practice Page'));
  expect(afterPagePractice).not.toEqual(pageDeckScheduleBefore);
  expect(afterPagePractice).toEqual([
    expect.objectContaining({
      word: 'mitigate',
      interval: 1,
      repetitions: 1,
      state: 'learning',
    }),
    expect.objectContaining({
      word: 'nuance',
      interval: 1,
      repetitions: 1,
      state: 'learning',
    }),
  ]);
  expect(afterPagePractice.every((card) => typeof card.nextReviewDate === 'string' && card.nextReviewDate)).toBe(true);

  await page.evaluate(() => {
    window.__practiceTranscripts = ['mitigate'];
  });

  const pronunciationSummaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/practice-sessions') && response.request().method() === 'POST');

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await page.getByTestId('practice-mode-pronunciation').click();
  await page.getByRole('button', { name: 'Start Pronunciation practice' }).click();
  await page.getByRole('button', { name: 'Start listening' }).click();
  await expect(page.getByTestId('practice-transcript')).toHaveValue('mitigate');
  await page.getByRole('button', { name: 'Check transcript' }).click();
  await page.getByTestId('practice-next-card').click();
  await page.getByRole('button', { name: 'Reveal / skip' }).click();
  await page.getByTestId('practice-next-card').click();

  const pronunciationSummaryPayload = (await (await pronunciationSummaryResponsePromise).json()).data;
  expect(pronunciationSummaryPayload.mode).toBe('pronunciation');
  expect(pronunciationSummaryPayload.totalCards).toBe(2);
  expect(pronunciationSummaryPayload.correctCards).toBe(1);
  expect(pronunciationSummaryPayload.wrongCards).toBe(1);

  const decksAfterPronunciationPractice = await listDecks(page, headers);
  expect(scheduleSnapshot(decksAfterPronunciationPractice.find((deck) => deck.name === 'Practice Board - Practice Page'))).toEqual(afterPagePractice);

  const inconsistentSummary = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/practice-sessions', {
    headers,
    data: {
      deckId: pageDeckBefore.id,
      mode: 'dictation',
      totalCards: 3,
      correctCards: 1,
      wrongCards: 1,
      timeZoneId: 'UTC',
    },
  });
  expect(inconsistentSummary.status()).toBe(422);

  const foreignAuth = await registerAndLogin(page, 'foreign-practice');
  await createBoardWithWords(page, foreignAuth.headers, 'Foreign Board', 'Foreign Page', ['private']);
  const foreignDecks = await listDecks(page, foreignAuth.headers);
  const foreignPageDeck = foreignDecks.find((deck) => deck.name === 'Foreign Board - Foreign Page');

  const foreignSummary = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/practice-sessions', {
    headers,
    data: {
      deckId: foreignPageDeck.id,
      mode: 'dictation',
      totalCards: 1,
      correctCards: 1,
      wrongCards: 0,
      timeZoneId: 'UTC',
    },
  });
  expect(foreignSummary.status()).toBe(404);
});

test('pronunciation practice shows an unsupported state when speech recognition is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  const { headers } = await registerAndLogin(page, 'flashcard-practice-unsupported');
  await createBoardWithWords(page, headers, 'Unsupported Board', 'Unsupported Page', ['clarity']);

  await page.goto('http://127.0.0.1:5173/flashcards');
  const pageDeckCard = page.locator('article.flashcard-deck').filter({ hasText: 'Unsupported Board - Unsupported Page' });
  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await page.getByTestId('practice-mode-pronunciation').click();
  await page.getByRole('button', { name: 'Start Pronunciation practice' }).click();

  await expect(page.getByTestId('practice-unsupported')).toContainText('Speech recognition is not supported here');
  await page.getByRole('button', { name: 'Back to mode selection' }).click();
  await expect(page.getByRole('button', { name: 'Start Pronunciation practice' })).toBeVisible();
});
