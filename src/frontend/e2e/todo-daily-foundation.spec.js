import { expect, test } from '@playwright/test';

function todayInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Todo Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  return { token: loginPayload.data.accessToken };
}

test('todo daily CRUD and foreign-owner protection smoke', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'todo');
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByRole('link', { name: 'Todo' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/todo');
  await expect(page.getByRole('heading', { name: 'TODO LIST' })).toBeVisible();

  await page.getByTestId('todo-title-input').fill('Review IELTS Unit 3');
  await page.getByTestId('todo-note-input').fill('Focus on listening');
  await page.getByTestId('create-todo-button').click();
  await expect(page.getByLabel('Complete Review IELTS Unit 3')).toBeVisible();
  await expect(page.getByText('Focus on listening')).toBeVisible();

  await page.getByLabel('Complete Review IELTS Unit 3').click();
  await page.getByRole('button', { name: /Completed/ }).click();
  await expect(page.locator('article.todo-card-v2').filter({ hasText: 'Review IELTS Unit 3' })).toHaveClass(/todo-card-v2--completed/);

  await page.getByLabel('Delete Review IELTS Unit 3').click();
  await expect(page.getByText('Review IELTS Unit 3')).toBeHidden();

  const owned = (await (await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'Owned API task', date: todayInput() },
  })).json()).data;

  const second = await registerAndLogin(page, 'todo-foreign');
  const foreign = await page.request.patch(`http://127.0.0.1:5000/api/v1/todos/${owned.id}`, {
    headers: { Authorization: `Bearer ${second.token}` },
    data: { isCompleted: false },
  });
  expect(foreign.status()).toBe(404);
});
