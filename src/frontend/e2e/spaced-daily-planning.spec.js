import { expect, test } from '@playwright/test';

test('review settings and All Words Spaced mode apply daily planning', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const email = `spaced-planning+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Spaced Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { token: registerPayload.data.emailVerificationToken },
  });
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByTestId('open-flashcards').click();
  await page.getByRole('link', { name: 'Review settings' }).click();
  await page.getByLabel('New cards per day').fill('1');
  await page.getByLabel('Review cards per day').fill('1');
  await page.getByRole('button', { name: /Save review settings/ }).click();
  await expect(page.getByText('Review settings saved.')).toBeVisible();

  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: 'Daily Planning', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Today' },
  })).json()).data;
  for (const word of ['first', 'second']) {
    await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
      headers,
      data: { word, meaningVn: word, meaningEn: word, class: 'other', example: `${word} example` },
    });
  }

  const secondBoard = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers,
    data: { name: 'Second Daily Board', language: 'en' },
  })).json()).data;
  const secondPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${secondBoard.id}/pages`, {
    headers,
    data: { name: 'Tomorrow' },
  })).json()).data;
  await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${secondBoard.id}/pages/${secondPage.id}/words`, {
    headers,
    data: { word: 'third', meaningVn: 'third', meaningEn: 'third', class: 'other', example: 'third example' },
  });

  const decks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', { headers })).json()).data;
  const allWords = decks.find((deck) => deck.type === 'AllWords');
  await page.getByRole('link', { name: 'Flashcards' }).click();
  await allWordsDeck(page, 'Daily Planning - All Words').getByRole('link', { name: 'Study All Words' }).click();
  await expect(page.getByRole('button', { name: /Spaced/ })).toHaveClass(/review-mode--active/);
  await page.getByTestId('start-review-session').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(page.getByTestId('review-summary')).toBeVisible();

  await page.getByRole('link', { name: 'Done' }).click();
  await allWordsDeck(page, 'Second Daily Board - All Words').getByRole('link', { name: 'Study All Words' }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByTestId('all-done-today')).toBeVisible();
  await page.getByRole('link', { name: 'Done' }).click();
  await allWordsDeck(page, 'Daily Planning - All Words').getByRole('link', { name: 'Study All Words' }).click();
  await page.getByTestId('start-review-session').click();
  await expect(page.getByTestId('all-done-today')).toBeVisible();
});

function allWordsDeck(page, name) {
  return page.locator('article.flashcard-deck').filter({ hasText: name });
}
