import { expect, test } from '@playwright/test';

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==';

async function registerAndLogin(page, prefix = 'notes') {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Notes Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return { email, token: loginPayload.data.accessToken };
}

async function makeImageDrop(page) {
  return page.evaluateHandle((base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([bytes], 'note-proof.png', { type: 'image/png' }));
    return dataTransfer;
  }, tinyPngBase64);
}

test('notes route is protected for anonymous users', async ({ page }) => {
  await page.goto('/notes');
  await expect(page).toHaveURL(/\/login$/);
});

test('Note Workspace release smoke covers CRUD, persistence, image upload, and cleanup lifecycle', async ({ browser, page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  const { token } = await registerAndLogin(page);
  const headers = { Authorization: `Bearer ${token}` };

  await expect(page.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes');
  await page.getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/notes');
  await expect(page.getByRole('heading', { name: 'No note boards yet' })).toBeVisible();

  await page.getByRole('button', { name: 'Create your first board' }).click();
  await page.getByLabel('Board name').fill('Release Proof Board');
  const createBoardPromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/notes/boards') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create board' }).click();
  const boardPayload = await (await createBoardPromise).json();
  const boardId = boardPayload.data.id;

  await expect(page.getByRole('heading', { name: 'Release Proof Board' })).toBeVisible();
  await page.getByRole('button', { name: 'Create first page' }).click();
  await page.getByLabel('Page name').fill('Release Proof Page');
  const createPagePromise = page.waitForResponse((response) => response.url().includes(`/api/v1/notes/boards/${boardId}/pages`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create page' }).click();
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

  const dropData = await makeImageDrop(page);
  await editor.dispatchEvent('drop', { dataTransfer: dropData });
  await expect(page.getByTestId('note-save-status')).toHaveText('Unsaved changes');
  await expect(editor.locator('img')).toHaveCount(1, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('note-save-status')).toHaveText('Saved');

  const pageDetailResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/notes/pages/${notePageId}`, { headers });
  expect(pageDetailResponse.ok()).toBe(true);
  const persistedPage = (await pageDetailResponse.json()).data;
  expect(persistedPage.name).toBe('Release Proof Page Updated');
  expect(persistedPage.content).toContain('data-note-asset-id=');
  expect(persistedPage.content).toContain('<img');
  expect(persistedPage.content).not.toContain('data:image/');

  const assetIdMatch = persistedPage.content.match(/data-note-asset-id="([^"]+)"/);
  expect(assetIdMatch).not.toBeNull();
  const noteAssetId = assetIdMatch[1];

  const listedAssets = (await (await page.request.get('http://127.0.0.1:5000/api/v1/assets?assetType=note-image', { headers })).json()).data;
  expect(listedAssets.some((asset) => asset.id === noteAssetId && asset.status === 'finalized')).toBe(true);

  await page.goto('/journal');
  await expect(page).toHaveURL('http://127.0.0.1:5173/journal');
  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'Release Proof Board' })).toBeVisible();
  await expect(page.getByLabel('Note title')).toHaveValue('Release Proof Page Updated');
  await expect(page.getByLabel('Journal rich text editor').locator('img')).toHaveCount(1);

  const base64Response = await page.request.patch(`http://127.0.0.1:5000/api/v1/notes/pages/${notePageId}`, {
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

  const cleanupPage = (await (await page.request.get(`http://127.0.0.1:5000/api/v1/notes/pages/${notePageId}`, { headers })).json()).data;
  expect(cleanupPage.content).not.toContain(noteAssetId);

  const assetsAfterCleanup = (await (await page.request.get('http://127.0.0.1:5000/api/v1/assets?assetType=note-image', { headers })).json()).data;
  expect(assetsAfterCleanup.some((asset) => asset.id === noteAssetId)).toBe(false);

  const foreignPage = await browser.newPage();
  const foreignUser = await registerAndLogin(foreignPage, 'notes-foreign');
  const foreignHeaders = { Authorization: `Bearer ${foreignUser.token}` };
  const foreignGetResponse = await foreignPage.request.get(`http://127.0.0.1:5000/api/v1/notes/pages/${notePageId}`, {
    headers: foreignHeaders,
  });
  expect(foreignGetResponse.status()).toBe(404);
  await foreignPage.close();

  const deleteBoardResponse = await page.request.delete(`http://127.0.0.1:5000/api/v1/notes/boards/${boardId}`, { headers });
  expect(deleteBoardResponse.ok()).toBe(true);

  const deletedPageResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/notes/pages/${notePageId}`, { headers });
  expect(deletedPageResponse.status()).toBe(404);

  expect(consoleErrors).toEqual([]);
});
