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

function seedDueDates(boardName) {
  const sql = `
UPDATE word_review_states AS state
SET next_review_date = CASE word.word
    WHEN 'alpha' THEN NOW() - INTERVAL '3 days'
    WHEN 'beta' THEN NOW() - INTERVAL '2 days'
    WHEN 'gamma' THEN NOW() - INTERVAL '1 day'
    ELSE state.next_review_date
  END
FROM vocab_words AS word
JOIN vocab_pages AS page ON page.id = word.page_id
JOIN vocab_boards AS board ON board.id = page.board_id
WHERE state.word_id = word.id
  AND board.name = '${boardName}';
`;

  execSync(`docker exec fluenta-postgres psql -U fluenta -d fluenta_dev -c "${sql.replace(/\r?\n/g, ' ')}"`, { stdio: 'pipe' });
}

test('review workflow enforces board-scoped due queues, overflow reschedule, and immediate answer persistence', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const { headers } = await registerAndLogin(page, 'review-workflow');
  const boardName = `Review Workflow Board ${Date.now()}`;
  await createBoardWithWords(page, headers, boardName, 'Review Workflow Page', ['alpha', 'beta', 'gamma']);

  const decks = await listDecks(page, headers);
  const deck = decks.find((item) => item.name === `${boardName} - Review Workflow Page`);
  const seededPractice = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/practice-sessions', {
    headers,
    data: {
      deckId: deck.id,
      mode: 'dictation',
      totalCards: 3,
      correctCards: 3,
      wrongCards: 0,
      timeZoneId: 'UTC',
    },
  });
  expect(seededPractice.status()).toBe(200);

  seedDueDates(boardName);

  await page.goto('/settings/review');
  await page.getByLabel('Daily limit').fill('2');
  await page.getByLabel('Recap after each correct answer').uncheck();
  await page.getByRole('button', { name: 'Save review settings' }).click();
  await expect(page.getByText('Review settings saved.')).toBeVisible();

  const settingsResponse = await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/settings', { headers });
  const settings = (await settingsResponse.json()).data;
  expect(settings.dailyLimit).toBe(2);
  expect(settings.recapAfterAnswer).toBe(false);

  const beforeStartDecks = await listDecks(page, headers);
  const alphaBefore = findDeckCard(beforeStartDecks, `${boardName} - Review Workflow Page`, 'alpha');
  const gammaBefore = findDeckCard(beforeStartDecks, `${boardName} - Review Workflow Page`, 'gamma');

  await page.goto('/flashcards/review');
  await page.getByLabel('Vocabulary board').selectOption({ label: `${boardName} (3 words)` });
  await page.getByRole('button', { name: 'Sequential Oldest due words first.' }).click();
  await page.getByRole('button', { name: 'Meaning -> Word' }).click();
  await page.getByRole('button', { name: 'Start review' }).click();

  await expect(page.getByText('1 / 2')).toBeVisible();

  const afterStartDecks = await listDecks(page, headers);
  const gammaAfterStart = findDeckCard(afterStartDecks, `${boardName} - Review Workflow Page`, 'gamma');
  expect(gammaAfterStart.nextReviewDate).not.toBe(gammaBefore.nextReviewDate);

  await page.getByTestId('show-answer').click();
  await expect(page.getByTestId('review-answer')).toContainText('alpha');
  await page.getByRole('button', { name: 'I was correct' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();

  const afterFirstAnswerDecks = await listDecks(page, headers);
  const alphaAfter = findDeckCard(afterFirstAnswerDecks, `${boardName} - Review Workflow Page`, 'alpha');
  expect(alphaAfter.nextReviewDate).not.toBe(alphaBefore.nextReviewDate);
  expect(alphaAfter.repetitions).toBeGreaterThanOrEqual(alphaBefore.repetitions);

  await page.getByTestId('show-answer').click();
  await expect(page.getByTestId('review-answer')).toContainText('beta');
  await page.getByRole('button', { name: 'I was wrong' }).click();
  await expect(page.getByTestId('review-summary')).toContainText('1 correct and 1 wrong across 2 reviewed words.');

  const foreign = await registerAndLogin(page, 'review-workflow-foreign');
  await createBoardWithWords(page, foreign.headers, `Foreign Review Board ${Date.now()}`, 'Foreign Page', ['private']);
  const foreignDecks = await listDecks(page, foreign.headers);
  const foreignBoardId = foreignDecks[0].boardId;
  const foreignStart = await page.request.post('http://127.0.0.1:5000/api/v1/flashcards/sessions', {
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
