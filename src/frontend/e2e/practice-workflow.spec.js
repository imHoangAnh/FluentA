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

function scheduleSnapshot(deck) {
  return [...deck.cards]
    .map((card) => ({
      word: card.word,
      interval: card.interval,
      repetitions: card.repetitions,
      state: card.state,
      nextReviewDate: card.nextReviewDate,
    }))
    .sort((left, right) => left.word.localeCompare(right.word));
}

test('practice workflow uses global sequence, leaves no abandoned progress, and persists only on full completion', async ({ page }) => {
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

  const { headers } = await registerAndLogin(page, 'practice-workflow');
  await createBoardWithWords(page, headers, 'Practice Workflow Board', 'Practice Workflow Page', ['mitigate', 'nuance']);

  const initialDecks = await listDecks(page, headers);
  const pageDeck = initialDecks.find((deck) => deck.name === 'Practice Workflow Board - Practice Workflow Page');
  const initialSchedule = scheduleSnapshot(pageDeck);

  await page.goto('/settings/review');
  await page.getByRole('button', { name: 'dictation' }).click();
  await page.getByRole('button', { name: 'Save practice settings' }).click();
  await expect(page.getByText('Practice settings saved.')).toBeVisible();

  const practiceSettingsResponse = await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/practice-settings', { headers });
  const practiceSettings = (await practiceSettingsResponse.json()).data;
  expect(practiceSettings.modeSequence).toEqual(['meaningToWord', 'pronunciation']);

  await page.goto('/flashcards');
  const pageDeckCard = page.locator('article.flashcard-deck').filter({ hasText: 'Practice Workflow Board - Practice Workflow Page' });
  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await expect(page.getByRole('heading', { name: 'Practice Workflow Board - Practice Workflow Page' })).toBeVisible();
  await expect(page.getByText('Meaning -> Word')).toBeVisible();
  await expect(page.getByText('pronunciation')).toBeVisible();
  await expect(page.getByText('recap', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByTestId('start-practice-session').click();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByTestId('active-practice-card').getByText('Meaning -> Word')).toBeVisible();
  await page.getByRole('link', { name: 'Back to decks' }).click();

  const afterAbandonDecks = await listDecks(page, headers);
  expect(scheduleSnapshot(afterAbandonDecks.find((deck) => deck.name === 'Practice Workflow Board - Practice Workflow Page'))).toEqual(initialSchedule);

  await page.evaluate(() => {
    window.__practiceTranscripts = ['mitigate'];
  });

  const summaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/flashcards/practice-sessions') && response.request().method() === 'POST');

  await pageDeckCard.getByRole('link', { name: 'Practice this Page Deck' }).click();
  await page.getByRole('button', { name: 'Sequential' }).click();
  await page.getByTestId('start-practice-session').click();

  await page.getByTestId('practice-answer-input').fill('wrong');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('That answer does not match yet. Try again or reveal the answer.')).toBeVisible();
  await page.getByTestId('practice-answer-input').fill('mitigate');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByTestId('practice-next-card').click();

  await page.getByRole('button', { name: 'Start listening' }).click();
  await expect(page.getByTestId('practice-transcript')).toHaveValue('mitigate');
  await page.getByRole('button', { name: 'Check transcript' }).click();
  await page.getByTestId('practice-next-card').click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('mitigate');
  await page.getByTestId('practice-next-card').click();

  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal / skip' }).click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('nuance');
  await page.getByTestId('practice-next-card').click();
  await page.getByRole('button', { name: 'Reveal / skip' }).click();
  await page.getByTestId('practice-next-card').click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('nuance');
  await page.getByTestId('practice-next-card').click();

  const summaryPayload = (await (await summaryResponsePromise).json()).data;
  expect(summaryPayload.totalCards).toBe(2);
  expect(summaryPayload.correctCards).toBe(1);
  expect(summaryPayload.wrongCards).toBe(1);
  await expect(page.getByTestId('practice-summary')).toContainText('1 words completed cleanly and 1 words needed reveal/skip');

  const completedDecks = await listDecks(page, headers);
  const completedSchedule = scheduleSnapshot(completedDecks.find((deck) => deck.name === 'Practice Workflow Board - Practice Workflow Page'));
  expect(completedSchedule).not.toEqual(initialSchedule);
  expect(completedSchedule).toEqual([
    expect.objectContaining({ word: 'mitigate', interval: 1, repetitions: 1, state: 'learning' }),
    expect.objectContaining({ word: 'nuance', interval: 1, repetitions: 1, state: 'learning' }),
  ]);
  expect(completedSchedule.every((card) => typeof card.nextReviewDate === 'string' && card.nextReviewDate)).toBe(true);
});
