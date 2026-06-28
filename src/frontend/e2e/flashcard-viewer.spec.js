import { expect, test } from '@playwright/test';

test('flashcard viewer is protected, owner-scoped, and refreshes from SignalR', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/flashcards');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  const email = `flashcards+${Date.now()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Flashcard Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  const token = loginPayload.data.accessToken;

  await page.getByTestId('board-name-input').fill('Live Flashcards');
  await page.getByTestId('create-board-button').click();
  await page.getByTestId('page-name-input').fill('Unit 1');
  await page.getByTestId('create-page-button').click();
  await expect(page.getByLabel('Rename Unit 1')).toBeVisible();

  const boardResponse = await page.request.get('http://127.0.0.1:5000/api/v1/boards', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const boards = (await boardResponse.json()).data;
  const board = boards.find((item) => item.name === 'Live Flashcards');
  const detailResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/boards/${board.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detail = (await detailResponse.json()).data;
  const vocabPage = detail.pages.find((item) => item.name === 'Unit 1');

  await page.getByTestId('open-flashcards').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/flashcards');
  await expect(page.getByRole('heading', { name: 'Your synchronized decks' })).toBeVisible();
  await expect(page.getByText('Live Flashcards - All Words')).toBeVisible();
  await expect(page.getByText('Live Flashcards - Unit 1')).toBeVisible();

  const wordInput = {
    word: 'synchronize',
    meaningVn: 'dong bo',
    meaningEn: 'coordinate',
    class: 'verb',
    example: 'Systems synchronize.',
  };

  const createStarted = Date.now();
  const createResponse = await page.request.post(
    `http://127.0.0.1:5000/api/v1/boards/${board.id}/pages/${vocabPage.id}/words`,
    { headers: { Authorization: `Bearer ${token}` }, data: wordInput },
  );
  const word = (await createResponse.json()).data;
  await expect(page.getByText('synchronize', { exact: true })).toHaveCount(2, { timeout: 3000 });
  const createVisibleMs = Date.now() - createStarted;

  const updateStarted = Date.now();
  await page.request.patch(`http://127.0.0.1:5000/api/v1/boards/${board.id}/words/${word.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...wordInput, word: 'synchronized' },
  });
  await expect(page.getByText('synchronized', { exact: true })).toHaveCount(2, { timeout: 3000 });
  const updateVisibleMs = Date.now() - updateStarted;

  const deleteStarted = Date.now();
  await page.request.delete(`http://127.0.0.1:5000/api/v1/boards/${board.id}/words/${word.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await expect(page.getByText('synchronized', { exact: true })).toHaveCount(0, { timeout: 3000 });
  const deleteVisibleMs = Date.now() - deleteStarted;

  const foreignEmail = `foreign-flashcards+${Date.now()}@example.com`;
  const foreignRegister = await page.request.post('http://127.0.0.1:5000/api/v1/auth/register', {
    data: { email: foreignEmail, password, fullName: 'Foreign Learner' },
  });
  const foreignRegistration = await foreignRegister.json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email: foreignEmail, otp: foreignRegistration.data.developmentOtp },
  });
  const foreignLogin = await page.request.post('http://127.0.0.1:5000/api/v1/auth/login', {
    data: { email: foreignEmail, password },
  });
  const foreignToken = (await foreignLogin.json()).data.accessToken;
  const foreignBoardResponse = await page.request.post('http://127.0.0.1:5000/api/v1/boards', {
    headers: { Authorization: `Bearer ${foreignToken}` },
    data: { name: 'Foreign Private Board', language: 'en' },
  });
  const foreignBoard = (await foreignBoardResponse.json()).data;
  const foreignPageResponse = await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${foreignBoard.id}/pages`, {
    headers: { Authorization: `Bearer ${foreignToken}` },
    data: { name: 'Foreign Page' },
  });
  const foreignPage = (await foreignPageResponse.json()).data;
  await page.request.post(`http://127.0.0.1:5000/api/v1/boards/${foreignBoard.id}/pages/${foreignPage.id}/words`, {
    headers: { Authorization: `Bearer ${foreignToken}` },
    data: wordInput,
  });
  const ownedDeckResponse = await page.request.get('http://127.0.0.1:5000/api/v1/flashcards/decks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ownedDecks = (await ownedDeckResponse.json()).data;
  expect(ownedDecks.some((deck) => deck.boardName === 'Foreign Private Board')).toBe(false);

  expect(Math.max(createVisibleMs, updateVisibleMs, deleteVisibleMs)).toBeLessThan(3000);
  console.log({ createVisibleMs, updateVisibleMs, deleteVisibleMs });
});
