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

async function listDecks(page, headers) {
  return (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
}

function findDeckCard(decks, deckName, word) {
  const deck = decks.find((item) => item.name === deckName);
  return deck.cards.find((card) => card.word === word);
}

function seedDueStates(boardName) {
  const sql = `
UPDATE review.word_states AS state
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

test('review workflow applies FluentA SRS transitions and rejects early review mutation', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });
  const browserTimeZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const { headers } = await registerAndLogin(page, 'review-workflow');
  const boardName = `Review Workflow Board ${Date.now()}`;
  await createBoardWithWords(page, headers, boardName, 'Review Workflow Page', ['alpha', 'beta', 'gamma']);

  const decks = await listDecks(page, headers);
  const deck = decks.find((item) => item.name === `${boardName} - Review Workflow Page`);
  const addToReview = await page.request.post('http://127.0.0.1:5000/api/v1/practice/add-to-review', {
    headers,
    data: { deckId: deck.id, timeZoneId: browserTimeZone },
  });
  expect(addToReview.status()).toBe(200);
  expect((await addToReview.json()).data.addedWordCount).toBe(3);

  seedDueStates(boardName);

  const settingsUpdate = await page.request.put('http://127.0.0.1:5000/api/v1/review/settings', {
    headers,
    data: { dailyLimit: 2, recapAfterAnswer: false },
  });
  expect(settingsUpdate.status()).toBe(200);

  const settingsResponse = await page.request.get('http://127.0.0.1:5000/api/v1/review/settings', { headers });
  const settings = (await settingsResponse.json()).data;
  expect(settings.dailyLimit).toBe(2);
  expect(settings.recapAfterAnswer).toBe(false);

  const beforeStartDecks = await listDecks(page, headers);
  const alphaBefore = findDeckCard(beforeStartDecks, `${boardName} - Review Workflow Page`, 'alpha');
  const betaBefore = findDeckCard(beforeStartDecks, `${boardName} - Review Workflow Page`, 'beta');
  const gammaBefore = findDeckCard(beforeStartDecks, `${boardName} - Review Workflow Page`, 'gamma');
  expect(alphaBefore.reviewLevel).toBe(0);
  expect(betaBefore.reviewLevel).toBe(2);
  expect(betaBefore.lapseCount).toBe(3);

  await page.goto('/review');
  await page.getByLabel('Vocabulary board').selectOption({ label: `${boardName} (3 words)` });
  await page.getByRole('button', { name: /Sequential/ }).click();
  await page.getByRole('button', { name: 'Meaning -> Word' }).click();
  await page.getByRole('button', { name: 'Start review' }).click();

  await expect(page.getByText('1 / 2')).toBeVisible();

  const afterStartDecks = await listDecks(page, headers);
  const gammaAfterStart = findDeckCard(afterStartDecks, `${boardName} - Review Workflow Page`, 'gamma');
  expect(gammaAfterStart.nextReviewDate).not.toBe(gammaBefore.nextReviewDate);

  const earlyReview = await page.request.post('http://127.0.0.1:5000/api/v1/review', {
    headers,
    data: {
      sessionId: crypto.randomUUID(),
      wordId: gammaBefore.wordId,
      correct: true,
      timeSpentSeconds: 1,
      timeZoneId: browserTimeZone,
    },
  });
  expect(earlyReview.status()).toBe(404);

  await page.getByTestId('show-answer').click();
  await expect(page.getByTestId('review-answer')).toContainText('alpha');
  await page.getByRole('button', { name: 'I was correct' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();

  const afterFirstAnswerDecks = await listDecks(page, headers);
  const alphaAfter = findDeckCard(afterFirstAnswerDecks, `${boardName} - Review Workflow Page`, 'alpha');
  expect(alphaAfter.reviewLevel).toBe(1);
  expect(alphaAfter.lapseCount).toBe(alphaBefore.lapseCount);
  expect(alphaAfter.nextReviewDate).not.toBe(alphaBefore.nextReviewDate);

  await page.getByTestId('show-answer').click();
  await expect(page.getByTestId('review-answer')).toContainText('beta');
  await page.getByRole('button', { name: 'I was wrong' }).click();
  await expect(page.getByTestId('review-summary')).toContainText('1 correct and 1 wrong across 2 reviewed words.');

  const afterSecondAnswerDecks = await listDecks(page, headers);
  const betaAfter = findDeckCard(afterSecondAnswerDecks, `${boardName} - Review Workflow Page`, 'beta');
  expect(betaAfter.reviewLevel).toBe(0);
  expect(betaAfter.lapseCount).toBe(betaBefore.lapseCount + 1);

  const foreign = await registerAndLogin(page, 'review-workflow-foreign');
  await createBoardWithWords(page, foreign.headers, `Foreign Review Board ${Date.now()}`, 'Foreign Page', ['private']);
  const foreignDecks = await listDecks(page, foreign.headers);
  const foreignBoardId = foreignDecks[0].boardId;
  const foreignStart = await page.request.post('http://127.0.0.1:5000/api/v1/review/sessions', {
    headers,
    data: {
      boardId: foreignBoardId,
      orderType: 'sequential',
      mode: 'dictation',
      timeZoneId: 'UTC',
    },
  });
  expect(foreignStart.status()).toBe(404);
});
