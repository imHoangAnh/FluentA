import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('dashboard counts aggregate page decks after review settings removal', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const { token, headers } = await loginSeededUser(page, { prefix: 'spaced-daily-planning' });

  await page.goto('/settings/review');
  await expect(page).toHaveURL(/\/settings\/practice$/);
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible();

  const board = (await (await page.request.post('https://localhost:7000/api/v1/boards', {
    headers,
    data: { name: 'Daily Planning', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Today' },
  })).json()).data;
  for (const word of ['first', 'second']) {
    await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
      headers,
      data: { word, meaningVn: word, meaningEn: word, class: 'other', example: `${word} example` },
    });
  }

  const secondBoard = (await (await page.request.post('https://localhost:7000/api/v1/boards', {
    headers,
    data: { name: 'Second Daily Board', language: 'en' },
  })).json()).data;
  const secondPage = (await (await page.request.post(`https://localhost:7000/api/v1/boards/${secondBoard.id}/pages`, {
    headers,
    data: { name: 'Tomorrow' },
  })).json()).data;
  await page.request.post(`https://localhost:7000/api/v1/boards/${secondBoard.id}/pages/${secondPage.id}/words`, {
    headers,
    data: { word: 'third', meaningVn: 'third', meaningEn: 'third', class: 'other', example: 'third example' },
  });

  await page.getByRole('link', { name: 'Flashcard' }).click();
  await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible();

  const dashboardResponse = await page.request.get('https://localhost:7000/api/v1/review/dashboard?timeZoneId=UTC', { headers });
  expect(dashboardResponse.status()).toBe(200);
  const dashboard = (await dashboardResponse.json()).data;
  expect(dashboard.totalCards).toBeGreaterThanOrEqual(0);
  expect(dashboard.newCards).toBeGreaterThanOrEqual(0);
  expect(dashboard.totalReviews).toBeGreaterThanOrEqual(0);
  expect(dashboard.overdue).toBeGreaterThanOrEqual(0);
  expect(dashboard.dueToday).toBe(0);
});
