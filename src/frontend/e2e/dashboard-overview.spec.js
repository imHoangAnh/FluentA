import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function utcIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

async function registerAndLogin(page) {
  const email = `dashboard+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Dashboard Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return { token: loginPayload.data.accessToken };
}

test('Dashboard Overview is the default authenticated home with actionable widgets', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  const { token } = await registerAndLogin(page);
  const headers = { Authorization: `Bearer ${token}` };
  const today = todayInput();

  await expect(page.getByText('Dashboard Overview')).toBeVisible();
  await expect(page.getByTestId('open-vocabulary')).toHaveAttribute('href', '/vocabulary');
  await expect(page.getByTestId('open-flashcards')).toHaveAttribute('href', '/flashcards');
  await expect(page.getByText('No cards due today')).toBeVisible();

  await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'Dashboard planning task', date: today, note: 'Overview proof' },
  });
  await page.request.post('http://127.0.0.1:5000/api/v1/habits', {
    headers,
    data: { name: 'Dashboard reading habit', description: 'Overview proof', icon: 'Book', frequency: 'Daily' },
  });
  await page.request.post('http://127.0.0.1:5000/api/v1/countdowns', {
    headers,
    data: { name: 'Dashboard IELTS date', targetDate: utcIso(14), color: '#16A34A', icon: 'Exam' },
  });

  await page.getByTestId('open-vocabulary').click();
  await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();
  await page.goBack();

  await expect(page.getByText('Dashboard planning task')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Dashboard reading habit')).toBeVisible();
  await expect(page.getByText('Dashboard IELTS date')).toBeVisible();

  await page.getByLabel('Check todo Dashboard planning task').click();
  await expect(page.getByLabel('Uncheck todo Dashboard planning task')).toBeVisible();

  await page.getByLabel('Check habit Dashboard reading habit').click();
  await expect(page.getByLabel('Uncheck habit Dashboard reading habit')).toBeVisible();

  const todoResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/todos?date=${today}`, { headers });
  const todos = (await todoResponse.json()).data;
  expect(todos.find((todo) => todo.title === 'Dashboard planning task')?.isCompleted).toBe(true);

  const habitResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/habits?timeZoneId=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers });
  const habits = (await habitResponse.json()).data;
  expect(habits.find((habit) => habit.name === 'Dashboard reading habit')?.isCheckedToday).toBe(true);
  expect(consoleErrors).toEqual([]);
});
