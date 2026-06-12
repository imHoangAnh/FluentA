import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Journal Search Learner');
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
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return loginPayload.data.accessToken;
}

async function createJournal(page, headers, title, content) {
  const response = await page.request.post('http://127.0.0.1:5000/api/v1/journals', {
    headers,
    data: { title, content },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

test('Journal Unicode content search highlights owned active matches', async ({ context, page }, testInfo) => {
  const token = await registerAndLogin(page, 'journal-search');
  const headers = { Authorization: `Bearer ${token}` };
  const matching = await createJournal(
    page,
    headers,
    'Vietnamese greeting practice',
    '<p>Today I practiced Xin chào with a friend. Later I wrote xin chào again.</p>',
  );
  await createJournal(page, headers, 'Grammar review', '<p>Past tense and sentence order.</p>');
  await createJournal(page, headers, 'Percent marker', '<p>Give language study 100% focus.</p>');
  const deleted = await createJournal(page, headers, 'Deleted private match', '<p>xin chào deleted</p>');
  await page.request.delete(`http://127.0.0.1:5000/api/v1/journals/${deleted.id}`, { headers });

  const foreignPage = await context.newPage();
  const foreignToken = await registerAndLogin(foreignPage, 'journal-search-foreign');
  await createJournal(
    foreignPage,
    { Authorization: `Bearer ${foreignToken}` },
    'Foreign private match',
    '<p>xin chào foreign</p>',
  );
  await foreignPage.close();

  const apiSearch = await page.request.get('http://127.0.0.1:5000/api/v1/journals/search?q=xin%20ch%C3%A0o', { headers });
  expect(apiSearch.status()).toBe(200);
  const apiMatches = (await apiSearch.json()).data;
  expect(apiMatches).toHaveLength(1);
  expect(apiMatches[0].id).toBe(matching.id);
  expect(apiMatches[0].highlights).toHaveLength(2);
  expect(apiMatches[0].preview).not.toContain('<p>');

  const wildcardSearch = await page.request.get('http://127.0.0.1:5000/api/v1/journals/search?q=%25', { headers });
  expect((await wildcardSearch.json()).data.map((entry) => entry.title)).toEqual(['Percent marker']);
  const invalidSearch = await page.request.get('http://127.0.0.1:5000/api/v1/journals/search?q=%20', { headers });
  expect(invalidSearch.status()).toBe(422);

  await page.getByTestId('open-journal').click();
  await page.getByTestId('journal-search-input').fill('xin chào');
  await expect(page.getByRole('button', { name: 'Open journal Vietnamese greeting practice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open journal Grammar review' })).toBeHidden();
  await expect(page.locator('.journal-entry-card mark')).toHaveCount(2);
  await expect(page.locator('.journal-entry-card mark').first()).toHaveText(/xin chào/i);

  await page.getByRole('button', { name: 'Open journal Vietnamese greeting practice' }).click();
  await expect(page.getByTestId('journal-title-input')).toHaveValue('Vietnamese greeting practice');
  await page.screenshot({ path: testInfo.outputPath('journal-search-highlight.png') });

  await page.getByLabel('Clear journal search').click();
  await expect(page.getByRole('button', { name: 'Open journal Grammar review' })).toBeVisible();
});

