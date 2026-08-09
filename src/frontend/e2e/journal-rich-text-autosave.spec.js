import { expect, test } from '@playwright/test';
import { apiUrl, loginSeededUser } from './support/auth-fixture.js';

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

test('Journal rich text sanitization and autosave contract', async ({ page }) => {
  const { headers } = await loginSeededUser(page, { prefix: 'journal-rich-text-autosave' });
  const created = await page.request.post(apiUrl('/journal'), {
    headers,
    data: { title: 'Rich Unicode note', content: '<p>Xin chào thế giới</p>', date: todayInput() },
  });
  expect(created.status()).toBe(201);
  const entry = (await created.json()).data;

  const unsafeResponse = await page.request.patch(apiUrl(`/journal/${entry.id}`), {
    headers,
    data: {
      title: 'Autosaved rich Unicode note',
      content: '<h2>Safe heading</h2><p onclick="alert(1)">Safe body</p><script>alert(2)</script><a href="javascript:alert(3)">Unsafe link</a>',
    },
  });
  expect(unsafeResponse.status()).toBe(200);
  const sanitized = (await unsafeResponse.json()).data;
  expect(sanitized.title).toBe('Autosaved rich Unicode note');
  expect(sanitized.content).toContain('<h2>Safe heading</h2>');
  expect(sanitized.content).not.toContain('script');
  expect(sanitized.content).not.toContain('onclick');
  expect(sanitized.content).not.toContain('javascript:');

  const detail = (await (await page.request.get(apiUrl(`/journal/${entry.id}`), { headers })).json()).data;
  expect(detail.content).toContain('Safe body');

  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('/journal');
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();
});
