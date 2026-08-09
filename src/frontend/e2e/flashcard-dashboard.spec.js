import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

test('flashcard library opens a seeded deck and preserves its viewer flow', async ({ page }) => {
  const { token, headers } = await loginSeededUser(page, { prefix: 'flashcard-dashboard' });

  const board = (await (await page.request.post('https://localhost:7000/api/v1/boards', {
    headers,
    data: { name: 'Dashboard Board', language: 'en' },
  })).json()).data;
  const vocabPage = (await (await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Dashboard Page' },
  })).json()).data;
  await page.request.post(`https://localhost:7000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, {
    headers,
    data: {
      word: 'forecast',
      meaningVn: 'du bao',
      definition: 'prediction',
      ipaPronunciation: '/ˈfɔːrkæst/',
      class: 'noun',
      example: 'The forecast is useful.',
      note: '',
      synonyms: '',
      antonyms: '',
    },
  });

  await page.getByRole('link', { name: 'Flashcard', exact: true }).click();
  await expect(page).toHaveURL('/flashcards');
  await expect(page.getByText('Dashboard Board', { exact: true })).toBeVisible();
  const pageDeck = page.getByRole('link', { name: /Open flashcards for Dashboard Page/ });
  await expect(pageDeck).toBeVisible();
  await pageDeck.click();
  await expect(page.getByTestId('flashcard-viewer-content')).toBeVisible();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('flashcard-back-content')).toContainText('prediction');
  await page.getByRole('link', { name: 'Finish' }).click();
  await expect(page).toHaveURL('/flashcards');
});
