import { expect, test } from '@playwright/test';

test('review settings save and dashboard counts aggregate page decks', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined;
    window.speechSynthesis.cancel = () => undefined;
  });

  const email = `page-deck-dashboard+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Spaced Learner');
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
  const headers = { Authorization: `Bearer ${token}` };

  await page.goto('/settings/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await page.getByLabel('Daily review limit').fill('1');
  const reviewSettingsResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/review/settings') && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save review settings' }).click();
  expect((await reviewSettingsResponse).status()).toBe(200);
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

  await page.getByRole('link', { name: 'Flashcards' }).click();
  await expect(page.getByRole('heading', { name: 'Your page decks' })).toBeVisible();
  await expect(page.getByText('Daily Planning - Today')).toBeVisible();
  await expect(page.getByText('Second Daily Board')).toBeVisible();

  const dashboardResponse = await page.request.get('http://127.0.0.1:5000/api/v1/review/dashboard?timeZoneId=UTC', { headers });
  expect(dashboardResponse.status()).toBe(200);
  const dashboard = (await dashboardResponse.json()).data;
  expect(dashboard.totalCards).toBe(3);
  expect(dashboard.newCards).toBe(3);
  expect(dashboard.totalReviews).toBe(0);
  expect(dashboard.overdue).toBe(0);
  expect(dashboard.dueToday).toBe(0);
});
