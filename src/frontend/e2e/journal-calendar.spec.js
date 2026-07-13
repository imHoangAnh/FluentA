import { expect, test } from '@playwright/test';

function monthInput(date = new Date()) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function dateInput(day) {
  return `${monthInput()}-${`${day}`.padStart(2, '0')}`;
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Journal Calendar Learner');
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

async function createJournal(page, headers, title, date) {
  const response = await page.request.post('http://127.0.0.1:5000/api/v1/journal', {
    headers,
    data: { title, content: `<p>${title}</p>`, date },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

test('Journal learning-date calendar opens populated dates and prepares empty dates', async ({ context, page }, testInfo) => {
  const token = await registerAndLogin(page, 'journal-calendar');
  const headers = { Authorization: `Bearer ${token}` };
  const populatedDate = dateInput(12);
  const deletedDate = dateInput(13);
  const emptyDate = dateInput(20);

  await createJournal(page, headers, 'First calendar note', populatedDate);
  const newest = await createJournal(page, headers, 'Newest calendar note', populatedDate);
  const deleted = await createJournal(page, headers, 'Deleted calendar note', deletedDate);
  await page.request.delete(`http://127.0.0.1:5000/api/v1/journal/${deleted.id}`, { headers });

  const foreignPage = await context.newPage();
  const foreignToken = await registerAndLogin(foreignPage, 'journal-calendar-foreign');
  await createJournal(foreignPage, { Authorization: `Bearer ${foreignToken}` }, 'Foreign calendar note', populatedDate);
  await foreignPage.close();

  const calendarResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/journal/calendar?month=${monthInput()}`, { headers });
  expect(calendarResponse.status()).toBe(200);
  const calendarDays = (await calendarResponse.json()).data;
  expect(calendarDays).toEqual([{ date: populatedDate, count: 2 }]);
  const invalidResponse = await page.request.get('http://127.0.0.1:5000/api/v1/journal/calendar?month=June', { headers });
  expect(invalidResponse.status()).toBe(422);

  await page.getByRole('link', { name: 'Journal' }).click();
  const populatedButton = page.getByTestId(`journal-calendar-day-${populatedDate}`);
  await expect(populatedButton).toHaveAccessibleName(`${populatedDate}, 2 journal entries`);
  await expect(populatedButton.locator('small')).toHaveText('2');
  await expect(page.getByTestId(`journal-calendar-day-${deletedDate}`).locator('small')).toHaveCount(0);

  await populatedButton.click();
  await expect(page.getByTestId('journal-title-input')).toHaveValue(newest.title);

  await page.getByTestId(`journal-calendar-day-${emptyDate}`).click();
  await expect(page.getByTestId('journal-date-input')).toHaveValue(emptyDate);
  await expect(page.getByTestId('journal-title-input')).toHaveValue(`Learning notes for ${emptyDate}`);
  await page.getByTestId('save-journal-button').click();
  await expect(page.getByRole('button', { name: `Open journal Learning notes for ${emptyDate}` })).toBeVisible();
  await expect(page.getByTestId(`journal-calendar-day-${emptyDate}`).locator('small')).toHaveText('1');

  await page.screenshot({ path: testInfo.outputPath('journal-calendar.png') });
});
