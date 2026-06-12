import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Kanban Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { token: registerPayload.data.emailVerificationToken },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return loginPayload.data.accessToken;
}

test('Kanban board foundation manages boards columns cards moves and filters', async ({ context, page }, testInfo) => {
  const token = await registerAndLogin(page, 'kanban');
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByTestId('open-kanban').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/kanban');
  await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible();

  await page.getByTestId('kanban-board-name-input').fill('Launch roadmap');
  await page.getByRole('button', { name: 'Create board' }).click();
  await expect(page.getByTestId('kanban-column-To Do')).toBeVisible();
  await expect(page.getByTestId('kanban-column-In Progress')).toBeVisible();
  await expect(page.getByTestId('kanban-column-Done')).toBeVisible();

  const listResponse = await page.request.get('http://127.0.0.1:5000/api/v1/kanban/boards', { headers });
  expect(listResponse.status()).toBe(200);
  const boards = (await listResponse.json()).data;
  const board = boards.find((item) => item.name === 'Launch roadmap');
  expect(board).toBeTruthy();

  const detailResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/kanban/boards/${board.id}`, { headers });
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()).data;
  expect(detail.columns.map((column) => column.name)).toEqual(['To Do', 'In Progress', 'Done']);

  await page.getByTestId('kanban-column-name-input').fill('Blocked');
  await page.getByRole('button', { name: 'Add column' }).click();
  await expect(page.getByTestId('kanban-column-Blocked')).toBeVisible();

  await page.getByTestId('kanban-card-title-input').fill('Outline speaking project');
  await page.getByTestId('kanban-card-column-select').selectOption({ label: 'To Do' });
  await page.getByTestId('kanban-card-priority-select').selectOption('High');
  await page.getByTestId('kanban-card-deadline-input').fill(todayInput());
  await page.getByTestId('kanban-card-description-input').fill('Prepare milestones');
  await page.getByTestId('kanban-card-tags-input').fill('Study, Roadmap');
  await page.getByRole('button', { name: 'Add card' }).click();
  const createdCard = page.getByTestId('kanban-card-Outline speaking project');
  await expect(createdCard).toBeVisible();
  await expect(createdCard.getByText('High')).toBeVisible();
  await expect(createdCard.getByText('Study')).toBeVisible();

  await page.getByLabel('Delete column To Do').click();
  await expect(page.getByText('Only empty columns can be deleted.')).toBeVisible();

  await page.getByTestId('kanban-search-input').fill('speaking');
  await expect(page.getByTestId('kanban-card-Outline speaking project')).toBeVisible();
  await page.getByTestId('kanban-search-input').fill('missing');
  await expect(page.getByTestId('kanban-card-Outline speaking project')).toBeHidden();
  await page.getByTestId('kanban-search-input').fill('');
  await page.getByLabel('Filter by priority').selectOption('High');
  await expect(page.getByTestId('kanban-card-Outline speaking project')).toBeVisible();
  await page.getByLabel('Filter by tag').selectOption('Study');
  await expect(page.getByTestId('kanban-card-Outline speaking project')).toBeVisible();
  await page.getByLabel('Filter by priority').selectOption('');
  await page.getByLabel('Filter by tag').selectOption('');

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByTestId('kanban-edit-title-input').fill('Edited speaking project');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByTestId('kanban-card-Edited speaking project')).toBeVisible();

  await page.getByRole('button', { name: 'Move' }).click();
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId('kanban-card-Edited speaking project')).toBeVisible();

  const movedDetail = (await (await page.request.get(`http://127.0.0.1:5000/api/v1/kanban/boards/${board.id}`, { headers })).json()).data;
  const movedCard = movedDetail.columns.flatMap((column) => column.cards).find((card) => card.title === 'Edited speaking project');
  const inProgress = movedDetail.columns.find((column) => column.name === 'In Progress');
  expect(movedCard.columnId).toBe(inProgress.id);

  const foreignPage = await context.newPage();
  const foreignToken = await registerAndLogin(foreignPage, 'kanban-foreign');
  const foreignResponse = await foreignPage.request.get(`http://127.0.0.1:5000/api/v1/kanban/boards/${board.id}`, {
    headers: { Authorization: `Bearer ${foreignToken}` },
  });
  expect(foreignResponse.status()).toBe(404);
  await foreignPage.close();

  await page.getByLabel('Delete card Edited speaking project').click();
  await expect(page.getByTestId('kanban-card-Edited speaking project')).toBeHidden();
  await page.getByLabel('Delete column Blocked').click();
  await expect(page.getByTestId('kanban-column-Blocked')).toBeHidden();

  await page.screenshot({ path: testInfo.outputPath('kanban-board.png'), fullPage: true });
});
