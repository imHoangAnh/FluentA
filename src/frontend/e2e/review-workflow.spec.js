import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Review Learner');
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

  return { email, headers: { Authorization: `Bearer ${token}` } };
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

function seedDueStates(boardName) {
  const sql = `
UPDATE word_review_states AS state
SET next_review_date = CASE word.word
    WHEN 'alpha' THEN NOW() - INTERVAL '3 days'
    WHEN 'beta' THEN NOW() - INTERVAL '2 days'
    WHEN 'gamma' THEN NOW() - INTERVAL '1 day'
    ELSE state.next_review_date
  END,
  level = CASE word.word
    WHEN 'beta' THEN 2
    ELSE 0
  END,
  lapse_count = CASE word.word
    WHEN 'beta' THEN 3
    ELSE 0
  END
FROM vocab_words AS word
JOIN vocab_pages AS page ON page.id = word.page_id
JOIN vocab_boards AS board ON board.id = page.board_id
WHERE state.word_id = word.id
  AND board.name = '${boardName}';
`;

  execSync(`docker exec fluenta-postgres psql -U fluenta -d fluenta_dev -c "${sql.replace(/\r?\n/g, ' ')}"`, { stdio: 'pipe' });
}

test('review workflow uses board-scoped queue and resume modal contract', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const browserTimeZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { headers } = await registerAndLogin(page, 'review-workflow');
  const boardName = `Review Workflow Board ${Date.now()}`;
  const { board, vocabPage } = await createBoardWithWords(page, headers, boardName, 'Review Workflow Page', ['alpha', 'beta', 'gamma']);

  const wordsResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/flashcards/pages/${vocabPage.id}/words`, { headers });
  const words = (await wordsResponse.json()).data.words;

  for (const word of words) {
    const addResponse = await page.request.post('http://127.0.0.1:5000/api/v1/practice/add-to-review', {
      headers,
      data: { pageId: vocabPage.id, wordId: word.wordId, timeZoneId: browserTimeZone },
    });
    expect(addResponse.status()).toBe(200);
  }

  seedDueStates(boardName);

  const settingsUpdate = await page.request.put('http://127.0.0.1:5000/api/v1/review/settings', {
    headers,
    data: { dailyLimit: 2, recapAfterAnswer: false },
  });
  expect(settingsUpdate.status()).toBe(200);

  await page.goto('/review');
  await page.getByLabel('Vocabulary board').selectOption({ label: `${boardName} (3 due)` });
  await page.getByRole('button', { name: /Sequential/ }).click();
  await page.getByRole('button', { name: 'Start review' }).click();

  await expect(page.getByText('1 / 2')).toBeVisible();

  const secondStart = await page.request.post('http://127.0.0.1:5000/api/v1/review/sessions', {
    headers,
    data: {
      boardId: board.id,
      orderType: 'sequential',
      mode: 'random',
      startBehavior: 'prompt',
      timeZoneId: browserTimeZone,
    },
  });
  expect(secondStart.status()).toBe(200);
  expect((await secondStart.json()).data.startDisposition).toBe('prompt');

  await page.getByLabel('Type the target word').fill('alpha');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
});
