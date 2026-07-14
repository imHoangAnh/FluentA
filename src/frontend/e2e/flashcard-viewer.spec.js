import { expect, test } from '@playwright/test';

test('flashcard viewer is protected, owner-scoped, and refreshes deck data', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/flashcards');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  const email = `flashcards+${Date.now()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Flashcard Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { email, otp: registerPayload.data.developmentOtp } });
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const board = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', { headers, data: { name: 'Live Flashcards', language: 'en' } })).json()).data;
  const vocabPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages`, { headers, data: { name: 'Unit 1' } })).json()).data;

  await page.goto('http://127.0.0.1:5173/flashcards');
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
  const word = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`, { headers, data: wordInput })).json()).data;
  const deckLink = page.getByRole('link', { name: 'Open flashcards for Unit 1, 1 words' });
  await expect(deckLink).toBeVisible({ timeout: 3000 });
  const createVisibleMs = Date.now() - createStarted;

  const updateStarted = Date.now();
  await page.request.patch(`http://127.0.0.1:5000/api/v1/boards/${board.id}/words/${word.id}`, { headers, data: { ...wordInput, word: 'synchronized' } });
  await deckLink.click();
  await expect(page).toHaveURL(new RegExp(`/flashcards/pages/${vocabPage.id}$`));
  await expect(page.getByRole('heading', { name: 'Unit 1', exact: true })).toBeVisible();
  await expect(page.getByTestId('flashcard-stage')).toContainText('synchronized');
  await page.getByTestId('flashcard-stage').click();
  await expect(page.getByTestId('flashcard-stage')).toContainText('dong bo');
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await expect(page.getByRole('link', { name: "Let's practice" })).toHaveAttribute('href', new RegExp(`/practice\\?deck=${vocabPage.id}`));
  await page.getByRole('link', { name: 'Finish' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  const updateVisibleMs = Date.now() - updateStarted;

  const foreignEmail = `foreign-flashcards+${Date.now()}@example.com`;
  const foreignRegistration = await (await page.request.post('http://127.0.0.1:5000/api/v1/auth/register', { data: { email: foreignEmail, password, fullName: 'Foreign Learner' } })).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { email: foreignEmail, otp: foreignRegistration.data.developmentOtp } });
  const foreignToken = (await (await page.request.post('http://127.0.0.1:5000/api/v1/auth/login', { data: { email: foreignEmail, password } })).json()).data.accessToken;
  const foreignBoard = (await (await page.request.post('http://127.0.0.1:5000/api/v1/boards', { headers: { Authorization: `Bearer ${foreignToken}` }, data: { name: 'Foreign Private Board', language: 'en' } })).json()).data;
  const foreignPage = (await (await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${foreignBoard.id}/pages`, { headers: { Authorization: `Bearer ${foreignToken}` }, data: { name: 'Foreign Page' } })).json()).data;
  await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${foreignBoard.id}/pages/${foreignPage.id}/words`, { headers: { Authorization: `Bearer ${foreignToken}` }, data: wordInput });
  const ownedDecks = (await (await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/pages', { headers })).json()).data;
  expect(ownedDecks.some((deck) => deck.boardName === 'Foreign Private Board')).toBe(false);

  const deleteStarted = Date.now();
  await page.request.delete(`http://127.0.0.1:5000/api/v1/boards/${board.id}/words/${word.id}`, { headers });
  await expect(page.getByTestId(`flashcard-page-${vocabPage.id}`)).toHaveAttribute('aria-disabled', 'true', { timeout: 3000 });
  const deleteVisibleMs = Date.now() - deleteStarted;
  expect(Math.max(createVisibleMs, updateVisibleMs, deleteVisibleMs)).toBeLessThan(3000);
});
