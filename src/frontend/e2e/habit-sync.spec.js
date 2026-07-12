import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMonth() {
  return todayInput().slice(0, 7);
}

async function registerAndLogin(page) {
  const email = `habit-sync+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Habit Sync Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return { email, password, token };
}

async function login(page, email, password) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('HabitChecked refreshes inactive Habit caches across protected routes', async ({ context, page }) => {
  const consoleErrors = [];
  const collectConsoleError = (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  };
  page.on('console', collectConsoleError);

  const { email, password, token } = await registerAndLogin(page);
  const headers = { Authorization: `Bearer ${token}` };
  const habit = (await (await page.request.post('http://127.0.0.1:5000/api/v1/habits', {
    headers,
    data: { name: 'Cross-tab reading', description: 'SignalR proof', icon: 'Book', frequency: 'Daily' },
  })).json()).data;

  await page.getByTestId('open-habits').click();
  await expect(page.getByRole('heading', { name: 'Cross-tab reading' })).toBeVisible();

  const secondTab = await context.newPage();
  secondTab.on('console', collectConsoleError);
  await login(secondTab, email, password);
  await secondTab.getByTestId('open-habits').click();
  await expect(secondTab.getByLabel(`Check Cross-tab reading on ${todayInput()}`)).toBeVisible({ timeout: 15_000 });
  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByTestId('open-countdown').click();
  await expect(secondTab.getByRole('heading', { name: 'Important dates' })).toBeVisible();

  const syncedHabitList = secondTab.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/api/v1/habits?timeZoneId='));
  const syncedEntries = secondTab.waitForResponse((response) =>
    response.request().method() === 'GET'
    && response.url().includes(`/api/v1/habits/${habit.id}/entries`)
    && response.url().includes(`month=${currentMonth()}`));

  await page.getByLabel(`Check Cross-tab reading on ${todayInput()}`).click();
  await expect(page.getByLabel(`Uncheck Cross-tab reading on ${todayInput()}`)).toBeVisible();

  const habitListPayload = await (await syncedHabitList).json();
  const entriesPayload = await (await syncedEntries).json();
  expect(habitListPayload.data.find((item) => item.id === habit.id)?.isCheckedToday).toBe(true);
  expect(entriesPayload.data.some((entry) => entry.date === todayInput())).toBe(true);

  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByTestId('open-habits').click();
  await expect(secondTab.getByLabel(`Uncheck Cross-tab reading on ${todayInput()}`)).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
