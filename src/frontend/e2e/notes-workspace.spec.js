import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix = 'notes') {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'notes-workspace' });
  return identity;
}

test('notes route is protected for anonymous users', async ({ page }) => {
  await page.goto('/notes');
  await expect(page).toHaveURL(/\/login$/);
});

test('Note Workspace release smoke covers CRUD, persistence, sanitization, and cleanup lifecycle', async ({ browser, page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  const { token } = await registerAndLogin(page);
  const headers = { Cookie: `access_token=${token}` };

  await expect(page.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes');
  await page.getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL('/notes');
  await expect(page.getByText('No note boards yet')).toBeVisible();

  await page.getByRole('button', { name: 'Create your first board' }).click();
  await page.getByLabel('Board name').fill('Release Proof Board');
  const createBoardPromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/notes/boards') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  const boardPayload = await (await createBoardPromise).json();
  const boardId = boardPayload.data.id;

  await expect(page.getByRole('button', { name: /Release Proof Board/ })).toBeVisible();
  await page.getByRole('button', { name: 'Create page' }).last().click();
  await page.getByLabel('Page name').fill('Release Proof Page');
  const createPagePromise = page.waitForResponse((response) => response.url().includes(`/api/v1/notes/boards/${boardId}/pages`) && response.request().method() === 'POST');
  await page.locator('form').getByRole('button', { name: 'Create page' }).click();
  const pagePayload = await (await createPagePromise).json();
  const notePageId = pagePayload.data.id;

  const editor = page.getByLabel('Journal rich text editor');
  await expect(page.getByLabel('Note title')).toHaveValue('Release Proof Page');
  await expect(editor).toContainText('');

  await page.getByLabel('Note title').fill('Release Proof Page Updated');
  await editor.click();
  await page.keyboard.type('Autosave body for Feature 25.');
  await expect(page.getByTestId('note-save-status')).toHaveText('Unsaved changes');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('note-save-status')).toHaveText('Saved');

  const pageDetailResponse = await page.request.get(`https://localhost:7000/api/v1/notes/pages/${notePageId}`, { headers });
  expect(pageDetailResponse.ok()).toBe(true);
  const persistedPage = (await pageDetailResponse.json()).data;
  expect(persistedPage.name).toBe('Release Proof Page Updated');
  await page.goto('/journal');
  await expect(page).toHaveURL('/journal');
  await page.goto('/notes');
  await expect(page.getByRole('button', { name: /Release Proof Board/ })).toBeVisible();
  await expect(page.getByLabel('Note title')).toHaveValue('Release Proof Page Updated');
  const base64Response = await page.request.patch(`https://localhost:7000/api/v1/notes/pages/${notePageId}`, {
    headers,
    data: {
      content: '<p>Bad image</p><p><img src="data:image/png;base64,AAAA" alt="bad" /></p>',
    },
  });
  expect(base64Response.status()).toBe(422);

  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Cleanup check after image removal.');
  await page.getByLabel('Note title').click();
  await expect(page.getByTestId('note-save-status')).toHaveText('Saved', { timeout: 10_000 });

  const foreignPage = await browser.newPage();
  const foreignUser = await registerAndLogin(foreignPage, 'notes-foreign');
  const foreignHeaders = { Cookie: `access_token=${foreignUser.token}` };
  const foreignGetResponse = await foreignPage.request.get(`https://localhost:7000/api/v1/notes/pages/${notePageId}`, {
    headers: foreignHeaders,
  });
  expect(foreignGetResponse.status()).toBe(404);
  await foreignPage.close();

  const deleteBoardResponse = await page.request.delete(`https://localhost:7000/api/v1/notes/boards/${boardId}`, { headers });
  expect(deleteBoardResponse.ok()).toBe(true);

  const deletedPageResponse = await page.request.get(`https://localhost:7000/api/v1/notes/pages/${notePageId}`, { headers });
  expect(deletedPageResponse.status()).toBe(404);

  expect(consoleErrors).toEqual([]);
});
