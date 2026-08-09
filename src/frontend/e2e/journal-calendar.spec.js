import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

function monthInput(date = new Date()) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function dateInput(day) {
  return `${monthInput()}-${`${day}`.padStart(2, '0')}`;
}

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'journal-calendar' });
  return identity;
}

async function createJournal(page, headers, title, date) {
  const response = await page.request.post('https://localhost:7000/api/v1/journal', {
    headers,
    data: { title, content: `<p>${title}</p>`, date },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

test('Journal learning-date calendar opens populated dates and prepares empty dates', async ({ context, page }, testInfo) => {
  const { token } = await registerAndLogin(page, 'journal-calendar');
  const headers = { Cookie: `access_token=${token}` };
  const populatedDate = dateInput(12);
  const deletedDate = dateInput(13);
  const emptyDate = dateInput(20);

  await createJournal(page, headers, 'First calendar note', populatedDate);
  const newest = await createJournal(page, headers, 'Newest calendar note', populatedDate);
  const deleted = await createJournal(page, headers, 'Deleted calendar note', deletedDate);
  await page.request.delete(`https://localhost:7000/api/v1/journal/${deleted.id}`, { headers });

  const foreignPage = await context.newPage();
  const { token: foreignToken } = await registerAndLogin(foreignPage, 'journal-calendar-foreign');
  await createJournal(foreignPage, { Cookie: `access_token=${foreignToken}` }, 'Foreign calendar note', populatedDate);
  await foreignPage.close();
  await page.context().addCookies([{ name: 'access_token', value: token, url: 'https://localhost:5173/', httpOnly: true, secure: true, sameSite: 'Strict' }]);

  const calendarResponse = await page.request.get(`https://localhost:7000/api/v1/journal/calendar?month=${monthInput()}`, { headers });
  expect(calendarResponse.status()).toBe(200);
  const calendarDays = (await calendarResponse.json()).data;
  expect(calendarDays).toEqual([{ date: populatedDate, count: 2 }]);
  const invalidResponse = await page.request.get('https://localhost:7000/api/v1/journal/calendar?month=June', { headers });
  expect(invalidResponse.status()).toBe(422);

  await page.getByRole('link', { name: 'Journal' }).click();
  const populatedButton = page.getByTestId(`journal-calendar-day-${populatedDate}`);
  await expect(populatedButton).toHaveAccessibleName(`${populatedDate}, 2 journal entries`);
  await expect(populatedButton.locator('small')).toHaveText('2');
  await expect(page.getByTestId(`journal-calendar-day-${deletedDate}`).locator('small')).toHaveCount(0);

  await populatedButton.click();
  await expect(page.getByTestId('journal-title-input')).toHaveValue(newest.title);

  await page.getByTestId(`journal-calendar-day-${emptyDate}`).click();
  await expect(page.getByTestId('journal-date-display')).toHaveAttribute('data-date', emptyDate);
  await expect(page.getByTestId('journal-title-input')).toHaveValue(`Learning notes for ${emptyDate}`);
  await page.getByTestId('save-journal-button').click();
  await expect(page.getByRole('button', { name: `Open journal Learning notes for ${emptyDate}` })).toBeVisible();
  await expect(page.getByTestId(`journal-calendar-day-${emptyDate}`).locator('small')).toHaveText('1');

  await page.screenshot({ path: testInfo.outputPath('journal-calendar.png') });
});
