import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'journal-search' });
  return identity;
}

function dateInput(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function createJournal(page, headers, title, content, date = dateInput()) {
  const response = await page.request.post('https://localhost:7000/api/v1/journal', {
    headers,
    data: { title, content, date },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

test('Journal Unicode title search highlights owned active matches', async ({ context, page }, testInfo) => {
  const { token } = await registerAndLogin(page, 'journal-search');
  const headers = { Cookie: `access_token=${token}` };
  const matching = await createJournal(
    page,
    headers,
    'Xin chào greeting practice',
    '<p>Today I practiced Xin chào with a friend. Later I wrote xin chào again.</p>',
  );
  await createJournal(page, headers, 'Grammar review', '<p>Past tense and sentence order.</p>', dateInput(1));
  const deleted = await createJournal(page, headers, 'xin chào deleted private match', '<p>xin chào deleted</p>', dateInput(2));
  await page.request.delete(`https://localhost:7000/api/v1/journal/${deleted.id}`, { headers });

  const foreignPage = await context.newPage();
  const { token: foreignToken } = await registerAndLogin(foreignPage, 'journal-search-foreign');
  await createJournal(
    foreignPage,
    { Cookie: `access_token=${foreignToken}` },
    'xin chào foreign private match',
    '<p>xin chào foreign</p>',
  );
  await foreignPage.close();
  await page.context().addCookies([{ name: 'access_token', value: token, url: 'https://localhost:5173/', httpOnly: true, secure: true, sameSite: 'Strict' }]);

  const apiSearch = await page.request.get('https://localhost:7000/api/v1/journal/search?q=xin%20ch%C3%A0o', { headers });
  expect(apiSearch.status()).toBe(200);
  const apiMatches = (await apiSearch.json()).data;
  expect(apiMatches).toHaveLength(1);
  expect(apiMatches[0].id).toBe(matching.id);
  expect(apiMatches[0].highlights).toHaveLength(1);

  const invalidSearch = await page.request.get('https://localhost:7000/api/v1/journal/search?q=%20', { headers });
  expect(invalidSearch.status()).toBe(400);

  await page.getByRole('link', { name: 'Journal' }).click();
  await page.getByTestId('journal-search-input').fill('xin chào');
  await expect(page.getByRole('button', { name: 'Open journal Xin chào greeting practice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open journal Grammar review' })).toBeHidden();
  await expect(page.locator('.journal-entry-card mark')).toHaveCount(1);
  await expect(page.locator('.journal-entry-card mark').first()).toHaveText(/xin chào/i);

  await page.getByRole('button', { name: 'Open journal Xin chào greeting practice' }).click();
  await expect(page.getByTestId('journal-title-input')).toHaveValue('Xin chào greeting practice');
  await page.screenshot({ path: testInfo.outputPath('journal-search-highlight.png') });

  await page.getByLabel('Clear journal search').click();
  await expect(page.getByRole('button', { name: 'Open journal Grammar review' })).toBeVisible();
});
