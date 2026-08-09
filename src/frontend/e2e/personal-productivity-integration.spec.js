import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'personal-productivity-integration' });
  return identity;
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('/');
}

test('personal productivity navigation and authenticated cross-tab Todo sync', async ({ context, page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to complete negotiation') && !message.text().includes('Failed to start the connection') && !message.text().includes('accounts.google.com')) consoleErrors.push(message.text());
  });
  const { email, password, token } = await registerAndLogin(page);
  const headers = { Cookie: `access_token=${token}` };
  const createTodoResponse = await page.request.post('https://localhost:7000/api/v1/todos', {
    headers,
    data: { title: 'Cross-tab integration task', date: todayInput() },
  });
  expect(createTodoResponse.ok()).toBe(true);
  const todo = (await createTodoResponse.json()).data;

  await expect(page.getByRole('link', { name: 'Todo', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Countdowns', exact: true })).toBeVisible();
  await page.goto(`/todo?taskId=${todo.id}`);
  await expect(page.getByLabel('Mark Cross-tab integration task as completed').first()).toBeVisible();

  const secondTab = await context.newPage();
  secondTab.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to complete negotiation') && !message.text().includes('Failed to start the connection') && !message.text().includes('accounts.google.com')) consoleErrors.push(message.text());
  });
  await login(secondTab, email, password);
  await secondTab.goto(`/todo?taskId=${todo.id}`);
  await expect(secondTab.getByLabel('Mark Cross-tab integration task as completed').first()).toBeVisible({ timeout: 15_000 });
  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByRole('link', { name: 'Countdowns' }).click();
  await expect(secondTab.getByRole('heading', { name: 'Countdowns' }).first()).toBeVisible();

  const syncedTodoResponse = secondTab.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/api/v1/todos?date='));
  await page.getByLabel('Mark Cross-tab integration task as completed').first().click();
  await page.getByRole('button', { name: /Completed/ }).click();
  await expect(page.locator('article.todo-my-day-row').filter({ hasText: 'Cross-tab integration task' })).toHaveClass(/todo-my-day-row--completed/);
  const syncedItems = (await (await syncedTodoResponse).json()).data;
  expect(syncedItems.find((item) => item.id === todo.id)?.isCompleted).toBe(true);

  await secondTab.getByRole('link', { name: 'Vocabulary' }).click();
  await secondTab.getByRole('link', { name: 'Todo' }).click();
  await secondTab.getByRole('button', { name: /Completed/ }).click();
  await expect(secondTab.getByLabel('Mark Cross-tab integration task as active')).toBeVisible();

  const response = await page.request.get(`https://localhost:7000/api/v1/todos?date=${todayInput()}`, { headers });
  const persisted = (await response.json()).data.find((item) => item.id === todo.id);
  expect(persisted.isCompleted).toBe(true);
  expect(consoleErrors).toEqual([]);
});
