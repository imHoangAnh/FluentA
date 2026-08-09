import { expect, test } from '@playwright/test';
import { apiUrl, loginSeededApi, loginSeededUser } from './support/auth-fixture.js';

test('flashcard viewer is protected, owner-scoped, and refreshes deck data', async ({ page }) => {
  await page.goto('/flashcards');
  await expect(page).toHaveURL(/\/login$/);

  const { password, headers } = await loginSeededUser(page, { prefix: 'flashcard-viewer' });
  const board = (await (await page.request.post(apiUrl('/boards'), { headers, data: { name: 'Live Flashcards', language: 'en' } })).json()).data;
  const vocabPage = (await (await page.request.post(apiUrl(`/boards/${board.id}/pages`), { headers, data: { name: 'Unit 1' } })).json()).data;

  await page.goto('/flashcards');
  await expect(page.getByRole('heading', { name: 'Flashcards', exact: true })).toBeVisible();
  await expect(page.getByTestId(`flashcard-page-${vocabPage.id}`)).toHaveAttribute('aria-disabled', 'true');

  const wordInput = {
    word: 'synchronize',
    meaningVn: 'dong bo',
    ipaPronunciation: '/ˈsɪŋ.krə.naɪz/',
    definition: 'coordinate',
    class: 'verb',
    example: 'Systems synchronize.',
    note: '',
    synonyms: '',
    antonyms: '',
  };

  const createStarted = Date.now();
  const word = (await (await page.request.post(apiUrl(`/boards/${board.id}/pages/${vocabPage.id}/words`), { headers, data: wordInput })).json()).data;
  const deckLink = page.getByRole('link', { name: 'Open flashcards for Unit 1, 1 words' });
  await expect(deckLink).toBeVisible({ timeout: 3000 });
  const createVisibleMs = Date.now() - createStarted;

  const updateStarted = Date.now();
  await page.request.patch(apiUrl(`/boards/${board.id}/words/${word.id}`), { headers, data: { ...wordInput, word: 'synchronized' } });
  await deckLink.click();
  await expect(page).toHaveURL(new RegExp(`/flashcards/pages/${vocabPage.id}$`));
  await expect(page.getByRole('heading', { name: 'Unit 1', exact: true })).toBeVisible();
  await expect(page.getByTestId('flashcard-stage')).toContainText('synchronized');
  await expect(page.getByTestId('flashcard-stage')).toContainText('/ˈsɪŋ.krə.naɪz/');
  await page.getByTestId('flashcard-stage').click();
  await expect(page.getByTestId('flashcard-stage')).toContainText('dong bo');
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await expect(page.getByRole('link', { name: "Let's practice" })).toHaveAttribute('href', new RegExp(`/practice\\?deck=${vocabPage.id}`));
  await page.getByRole('link', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/flashcards$/);
  const updateVisibleMs = Date.now() - updateStarted;

  const foreign = await loginSeededApi(page.request, { prefix: 'foreign-flashcard-viewer', fullName: 'Foreign Learner' });
  const foreignBoard = (await (await page.request.post(apiUrl('/boards'), { headers: foreign.headers, data: { name: 'Foreign Private Board', language: 'en' } })).json()).data;
  const foreignPage = (await (await page.request.post(apiUrl(`/boards/${foreignBoard.id}/pages`), { headers: foreign.headers, data: { name: 'Foreign Page' } })).json()).data;
  await page.request.post(apiUrl(`/boards/${foreignBoard.id}/pages/${foreignPage.id}/words`), { headers: foreign.headers, data: wordInput });
  const ownedDecks = (await (await page.request.get(apiUrl('/flashcards/pages'), { headers })).json()).data;
  expect(ownedDecks.some((deck) => deck.boardName === 'Foreign Private Board')).toBe(false);
  const ownedCard = ownedDecks.flatMap((deck) => deck.pages).find((deckPage) => deckPage.pageId === vocabPage.id).words[0];
  expect(ownedCard).toMatchObject({ ipaPronunciation: '/ˈsɪŋ.krə.naɪz/', synonyms: null, antonyms: null });
  expect(ownedCard).not.toHaveProperty('thesaurus');
  expect(ownedCard).not.toHaveProperty('collocation');

  const deleteStarted = Date.now();
  await page.request.delete(apiUrl(`/boards/${board.id}/words/${word.id}`), { headers });
  await expect(page.getByTestId(`flashcard-page-${vocabPage.id}`)).toHaveAttribute('aria-disabled', 'true', { timeout: 3000 });
  const deleteVisibleMs = Date.now() - deleteStarted;
  expect(Math.max(createVisibleMs, updateVisibleMs, deleteVisibleMs)).toBeLessThan(3000);
});
