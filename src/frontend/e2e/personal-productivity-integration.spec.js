import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page) {
  const email = `personal-productivity+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Productivity Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { token: registerPayload.data.emailVerificationToken },
  });

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  return { email, password, token };
}

async function login(page, email, password) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('personal productivity navigation and authenticated cross-tab Todo sync', async ({ context, page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const { email, password, token } = await registerAndLogin(page);
  const headers = { Authorization: `Bearer ${token}` };
  const todo = (await (await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'Cross-tab integration task', date: todayInput() },
  })).json()).data;

  await expect(page.getByTestId('open-todo')).toBeVisible();
  await expect(page.getByTestId('open-countdown')).toBeVisible();
  await page.getByTestId('open-todo').click();
  await expect(page.getByLabel('Complete Cross-tab integration task')).toBeVisible();

  const secondTab = await context.newPage();
  secondTab.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await login(secondTab, email, password);
  await secondTab.getByTestId('open-todo').click();
  await expect(secondTab.getByLabel('Complete Cross-tab integration task')).toBeVisible({ timeout: 15_000 });
  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByTestId('open-countdown').click();
  await expect(secondTab.getByRole('heading', { name: 'Important dates' })).toBeVisible();

  const syncedTodoResponse = secondTab.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/api/v1/todos?date='));
  await page.getByLabel('Complete Cross-tab integration task').click();
  await expect(page.locator('article.todo-item').filter({ hasText: 'Cross-tab integration task' })).toHaveClass(/todo-item--completed/);
  const syncedItems = (await (await syncedTodoResponse).json()).data;
  expect(syncedItems.find((item) => item.id === todo.id)?.isCompleted).toBe(true);

  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByTestId('open-todo').click();
  await expect(secondTab.getByLabel('Complete Cross-tab integration task')).toBeChecked();

  const response = await page.request.get(`http://127.0.0.1:5000/api/v1/todos?date=${todayInput()}`, { headers });
  const persisted = (await response.json()).data.find((item) => item.id === todo.id);
  expect(persisted.isCompleted).toBe(true);
  expect(consoleErrors).toEqual([]);
});
