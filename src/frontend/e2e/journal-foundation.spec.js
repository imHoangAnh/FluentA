import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Journal Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return { token: loginPayload.data.accessToken };
}

test('Journal foundation CRUD, Unicode, ordering, and ownership smoke', async ({ context, page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  const { token } = await registerAndLogin(page, 'journal');
  const headers = { Authorization: `Bearer ${token}` };
  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/journal');
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();

  await page.getByTestId('journal-title-input').fill('Học tiếng Việt');
  await page.getByLabel('Journal rich text editor').fill('Xin chào thế giới. Đây là ghi chú Unicode.');
  await page.getByTestId('save-journal-button').click();
  await expect(page.getByRole('button', { name: 'Open journal Học tiếng Việt' })).toBeVisible();

  await page.getByLabel('New journal entry').click();
  await page.getByTestId('journal-title-input').fill('Second entry');
  await page.getByLabel('Journal rich text editor').fill('Newest note');
  await page.getByTestId('save-journal-button').click();
  await expect(page.locator('.journal-entry-card').first()).toContainText('Second entry');

  await page.getByRole('button', { name: 'Open journal Học tiếng Việt' }).click();
  await page.getByTestId('journal-title-input').fill('Học tiếng Việt hôm nay');
  await page.getByLabel('Journal rich text editor').fill('Nội dung mới');
  await page.getByTestId('save-journal-button').click();
  await expect(page.getByRole('button', { name: 'Open journal Học tiếng Việt hôm nay' })).toBeVisible();

  const listResponse = await page.request.get('http://127.0.0.1:5000/api/v1/journal', { headers });
  const entries = (await listResponse.json()).data;
  const privateEntry = entries.find((entry) => entry.title === 'Học tiếng Việt hôm nay');
  expect(privateEntry.date).toBe(todayInput());
  const detailResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/journal/${privateEntry.id}`, { headers });
  expect((await detailResponse.json()).data.content).toContain('Nội dung mới');

  const secondPage = await context.newPage();
  const second = await registerAndLogin(secondPage, 'journal-foreign');
  const foreignResponse = await secondPage.request.get(`http://127.0.0.1:5000/api/v1/journal/${privateEntry.id}`, {
    headers: { Authorization: `Bearer ${second.token}` },
  });
  expect(foreignResponse.status()).toBe(404);
  await secondPage.close();

  await page.getByLabel('Delete journal Học tiếng Việt hôm nay').click();
  await page.getByRole('button', { name: 'Delete entry' }).click();
  await expect(page.getByRole('button', { name: 'Open journal Học tiếng Việt hôm nay' })).toBeHidden();
  const deletedResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/journal/${privateEntry.id}`, { headers });
  expect(deletedResponse.status()).toBe(404);
  expect(consoleErrors).toEqual([]);
});
