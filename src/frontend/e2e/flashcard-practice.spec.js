import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'flashcard-practice' });
  return identity;
}

async function createBoardWithWords(page, headers, boardName, pageName, words) {
  const board = (await (await page.request.post('https://localhost:7000/api/v1/boards', {
    headers,
    data: { name: boardName, language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: pageName },
  })).json()).data;

  for (const word of words) {
    await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
      headers,
      data: {
        word,
        meaningVn: `${word} vn`,
        definition: `${word} definition`,
        ipaPronunciation: '/ˈtest/',
        class: 'other',
        example: `${word} example.`,
        note: '',
        synonyms: '',
        antonyms: '',
      },
    });
  }

  return { board, vocabPage };
}

test('practice persists a summary for the selected page', async ({ page }) => {
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
  const { vocabPage } = await createBoardWithWords(page, headers, 'Practice Board', 'Practice Page', ['mitigate', 'nuance']);
  await page.request.put('https://localhost:7000/api/v1/practice/settings', { headers, data: { modeSequence: ['dictation'] } });
  await page.goto(`/practice?deck=${vocabPage.id}`);
  await expect(page.getByRole('heading', { name: 'Start practice' })).toBeVisible();

  const dictationSummaryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/practice/sessions') && response.request().method() === 'POST');

  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByText('1 of 2')).toBeVisible();

  await page.getByTestId('practice-answer-input').fill('wrong');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Wrong, please try again')).toBeVisible();
  await expect(page.getByText('1 of 2')).toBeVisible();

  await page.getByTestId('practice-answer-input').fill('mitigate');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('2 of 2')).toBeVisible();

  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('practice-answer-reveal')).toContainText('nuance');
  await page.getByTestId('practice-next-card').click();

  const dictationSummaryPayload = (await (await dictationSummaryResponsePromise).json()).data;
  expect(dictationSummaryPayload.mode).toBe('dictation');
  expect(dictationSummaryPayload.totalCards).toBe(2);
  expect(dictationSummaryPayload.correctCards).toBe(0);
  expect(dictationSummaryPayload.wrongCards).toBe(2);
  await expect(page).toHaveURL('/practice');

  const inconsistentSummary = await page.request.post('https://localhost:7000/api/v1/practice/sessions', {
    headers,
    data: {
      pageId: vocabPage.id,
      mode: 'dictation',
      totalCards: 3,
      correctCards: 1,
      wrongCards: 1,
      timeZoneId: 'UTC',
    },
  });
  expect(inconsistentSummary.status()).toBe(422);

});

test('pronunciation practice shows an unsupported state when speech recognition is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });

  const { headers } = await registerAndLogin(page, 'flashcard-practice-unsupported');
  const { vocabPage } = await createBoardWithWords(page, headers, 'Unsupported Board', 'Unsupported Page', ['clarity']);
  await page.request.put('https://localhost:7000/api/v1/practice/settings', { headers, data: { modeSequence: ['pronunciation'] } });
  await page.goto(`/practice?deck=${vocabPage.id}`);
  await page.getByRole('button', { name: 'Start practice' }).click();

  await expect(page.getByText('Microphone recording is unavailable in this browser.')).toBeVisible();
});
