import { expect, test } from '@playwright/test';

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Kanban Sync Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { token: registerPayload.data.emailVerificationToken },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  const token = await login(page, email, password);
  return { email, password, token };
}

async function login(page, email, password) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const token = (await (await loginResponsePromise).json()).data.accessToken;
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return token;
}

test('KanbanCardMoved syncs card movement across same-user tabs', async ({ context, page }) => {
  const consoleErrors = [];
  const collectConsoleError = (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  };
  page.on('console', collectConsoleError);

  const { email, password } = await registerAndLogin(page, 'kanban-sync');

  await page.getByTestId('open-kanban').click();
  await page.getByTestId('kanban-board-name-input').fill('Sync board');
  await page.getByRole('button', { name: 'Create board' }).click();
  await expect(page.getByTestId('kanban-column-To Do')).toBeVisible();
  await expect(page.getByTestId('kanban-column-In Progress')).toBeVisible();

  await page.getByTestId('kanban-card-title-input').fill('Move me live');
  await page.getByTestId('kanban-card-column-select').selectOption({ label: 'To Do' });
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.getByTestId('kanban-column-To Do').getByTestId('kanban-card-Move me live')).toBeVisible();

  const secondTab = await context.newPage();
  secondTab.on('console', collectConsoleError);
  const secondTabHubSockets = [];
  secondTab.on('websocket', (socket) => {
    if (socket.url().includes('/hubs/sync')) {
      secondTabHubSockets.push(socket.url());
    }
  });
  const secondTabKanbanResponses = [];
  secondTab.on('response', (response) => {
    if (response.request().method() === 'GET' && response.url().includes('/api/v1/kanban/boards')) {
      secondTabKanbanResponses.push(response.url());
    }
  });
  await login(secondTab, email, password);
  await secondTab.getByTestId('open-kanban').click();
  await expect(secondTab.getByTestId('kanban-column-To Do').getByTestId('kanban-card-Move me live')).toBeVisible({ timeout: 15_000 });
  await expect(secondTab.getByTestId('kanban-column-In Progress').getByTestId('kanban-card-Move me live')).toHaveCount(0);
  await expect.poll(() => secondTabHubSockets.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);

  const responseCountBeforeMove = secondTabKanbanResponses.length;

  await page.getByTestId('kanban-card-Move me live').getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId('kanban-card-Move me live')).toBeVisible();
  await expect(secondTab.getByTestId('kanban-column-In Progress').getByTestId('kanban-card-Move me live')).toBeVisible();
  expect(secondTabKanbanResponses.length).toBeGreaterThan(responseCountBeforeMove);
  expect(consoleErrors).toEqual([]);
});
