import { expect, test } from '@playwright/test';

async function registerAndLogin(page) {
  const email = `journal-rich+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Rich Journal Learner');
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
  return loginPayload.data.accessToken;
}

test('Journal rich text sanitization and autosave', async ({ page }, testInfo) => {
  const token = await registerAndLogin(page);
  const headers = { Authorization: `Bearer ${token}` };
  const editorStartedAt = Date.now();
  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/journal');
  const editor = page.getByLabel('Journal rich text editor');
  await expect(editor).toBeVisible();
  expect(Date.now() - editorStartedAt).toBeLessThan(500);
  for (const control of [
    'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Bold', 'Italic', 'Underline',
    'Highlight', 'Bullet list', 'Ordered list', 'Task list',
    'Align left', 'Align center', 'Align right', 'Justify', 'Undo', 'Redo',
  ]) {
    await expect(page.getByRole('button', { name: control })).toBeVisible();
  }

  await page.getByTestId('journal-title-input').fill('Rich Unicode note');
  await page.getByRole('button', { name: 'Bold' }).click();
  await editor.fill('Xin chào thế giới');
  await page.getByTestId('save-journal-button').click();
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved');

  const listPayload = await (await page.request.get('http://127.0.0.1:5000/api/v1/journal', { headers })).json();
  const entry = listPayload.data.find((item) => item.title === 'Rich Unicode note');
  const richDetail = await (await page.request.get(`http://127.0.0.1:5000/api/v1/journal/${entry.id}`, { headers })).json();
  expect(richDetail.data.content).toContain('Xin chào thế giới');

  const unsafeResponse = await page.request.patch(`http://127.0.0.1:5000/api/v1/journal/${entry.id}`, {
    headers,
    data: {
      content: '<h2>Safe heading</h2><p onclick="alert(1)">Safe body</p><script>alert(2)</script><a href="javascript:alert(3)">Unsafe link</a>',
    },
  });
  const sanitized = (await unsafeResponse.json()).data;
  expect(sanitized.content).toContain('<h2>Safe heading</h2>');
  expect(sanitized.content).not.toContain('script');
  expect(sanitized.content).not.toContain('onclick');
  expect(sanitized.content).not.toContain('javascript:');

  await page.getByRole('button', { name: 'Open journal Rich Unicode note' }).click();
  await page.getByTestId('journal-title-input').fill('Autosaved rich Unicode note');
  await expect(page.getByTestId('journal-save-status')).toHaveText('Unsaved changes');
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved', { timeout: 5_000 });

  const updatedList = await (await page.request.get('http://127.0.0.1:5000/api/v1/journal', { headers })).json();
  expect(updatedList.data.some((item) => item.title === 'Autosaved rich Unicode note')).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('journal-rich-text-desktop.png') });
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.getByRole('toolbar', { name: 'Journal formatting tools' })).toBeVisible();
  await expect(editor).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('journal-rich-text-tablet.png') });
});
