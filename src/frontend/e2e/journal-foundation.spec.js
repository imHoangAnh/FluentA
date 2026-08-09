import { expect, test } from '@playwright/test';
import { apiUrl, loginSeededApi, loginSeededUser } from './support/auth-fixture.js';

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

test('Journal foundation CRUD, Unicode, ordering, and ownership smoke', async ({ page }) => {
  const { headers } = await loginSeededUser(page, { prefix: 'journal-foundation' });
  const today = todayInput();

  const firstResponse = await page.request.post(apiUrl('/journal'), {
    headers,
    data: { title: 'Học tiếng Việt', content: '<p>Xin chào thế giới.</p>', date: today },
  });
  expect(firstResponse.status()).toBe(201);
  const first = (await firstResponse.json()).data;

  const secondResponse = await page.request.post(apiUrl('/journal'), {
    headers,
    data: { title: 'Second entry', content: '<p>Newest note</p>', date: today },
  });
  expect(secondResponse.status()).toBe(201);
  const second = (await secondResponse.json()).data;

  const list = (await (await page.request.get(apiUrl('/journal'), { headers })).json()).data;
  expect(list.map((entry) => entry.title)).toEqual(expect.arrayContaining(['Học tiếng Việt', 'Second entry']));

  const updateResponse = await page.request.patch(apiUrl(`/journal/${first.id}`), {
    headers,
    data: { title: 'Học tiếng Việt hôm nay', content: '<p>Nội dung mới</p>', date: today },
  });
  expect(updateResponse.status()).toBe(200);
  expect((await updateResponse.json()).data.title).toBe('Học tiếng Việt hôm nay');

  const detail = (await (await page.request.get(apiUrl(`/journal/${first.id}`), { headers })).json()).data;
  expect(detail.content).toContain('Nội dung mới');

  const foreign = await loginSeededApi(page.request, { prefix: 'journal-foreign' });
  const foreignResponse = await page.request.get(apiUrl(`/journal/${first.id}`), { headers: foreign.headers });
  expect(foreignResponse.status()).toBe(404);

  const deleteResponse = await page.request.delete(apiUrl(`/journal/${second.id}`), { headers });
  expect(deleteResponse.status()).toBe(200);
  expect((await page.request.get(apiUrl(`/journal/${second.id}`), { headers })).status()).toBe(404);

  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('/journal');
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();
});
