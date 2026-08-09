import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'project-board' });
  return identity;
}

test('Project board foundation manages boards columns cards moves and filters', async ({ context, page }, testInfo) => {
  const { token } = await registerAndLogin(page, 'project');
  const headers = { Cookie: `access_token=${token}` };

  await page.getByRole('link', { name: 'Project' }).click();
  await expect(page).toHaveURL('/project');
  await expect(page.getByRole('heading', { level: 1, name: 'Project' })).toBeVisible();

  await page.getByTestId('project-empty-new-project').click();
  await page.getByTestId('project-empty-project-input').fill('Launch roadmap');
  await page.getByTestId('project-empty-project-input').press('Enter');
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();
  await expect(page.getByTestId('project-column-To Do')).toBeVisible();
  await expect(page.getByTestId('project-column-In Progress')).toBeVisible();
  await expect(page.getByTestId('project-column-Done')).toBeVisible();

  await page.getByTestId('project-board-name-input').fill('Archive candidate');
  await page.getByTestId('project-board-name-input').press('Enter');
  await expect(page.getByRole('heading', { name: 'Archive candidate' })).toBeVisible();
  await page.getByRole('button', { name: 'Launch roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();

  await page.getByRole('button', { name: 'Launch roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();

  const listResponse = await page.request.get('https://localhost:7000/api/v1/project/boards', { headers });
  expect(listResponse.status()).toBe(200);
  const boards = (await listResponse.json()).data;
  const board = boards.find((item) => item.name === 'Launch roadmap');
  expect(board).toBeTruthy();

  const detailResponse = await page.request.get(`https://localhost:7000/api/v1/project/boards/${board.id}`, { headers });
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()).data;
  expect(detail.columns.map((column) => column.name)).toEqual(['To Do', 'In Progress', 'Done']);

  await page.getByRole('button', { name: 'Add column' }).click();
  await page.getByTestId('project-column-name-input').fill('Blocked');
  await page.getByTestId('project-column-name-input').press('Enter');
  await expect(page.getByTestId('project-column-Blocked')).toBeVisible();

  await page.getByTestId('project-column-To Do').getByRole('button', { name: 'Add Card' }).click();
  const createPanel = page.getByRole('dialog');
  await expect(createPanel).toBeVisible();
  await page.getByTestId('project-edit-title-input').fill('Outline speaking project');
  await createPanel.getByRole('button', { name: 'Priority' }).click();
  await page.getByRole('option', { name: 'High', exact: true }).click();
  await createPanel.getByLabel('Deadline').fill(todayInput());
  await createPanel.getByRole('button', { name: 'Save card' }).click();
  const createdCard = page.getByTestId('project-card-Outline speaking project');
  await expect(createdCard).toBeVisible();

  await page.getByRole('button', { name: 'Filter by priority' }).click();
  await page.getByRole('option', { name: 'Critical', exact: true }).click();
  await expect(createdCard).toBeHidden();
  await page.getByRole('button', { name: 'Filter by priority' }).click();
  await page.getByRole('option', { name: 'High', exact: true }).click();
  await expect(createdCard).toBeVisible();
  await page.getByRole('button', { name: 'Filter by deadline' }).click();
  await page.getByRole('option', { name: 'Due this week', exact: true }).click();
  await expect(createdCard).toBeVisible();
  await page.getByRole('button', { name: 'Filter by deadline' }).click();
  await page.getByRole('option', { name: 'Overdue', exact: true }).click();
  await expect(createdCard).toBeHidden();
  await page.getByRole('button', { name: 'Filter by deadline' }).click();
  await page.getByRole('option', { name: 'All deadlines', exact: true }).click();

  const editCardButton = page.getByRole('button', { name: 'Edit Outline speaking project' });
  await editCardButton.click();
  const editPanel = page.getByRole('dialog');
  await expect(editPanel).toBeVisible();
  await expect(editPanel.getByText(/Move to/i)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(editPanel).toBeHidden();
  await expect(editCardButton).toBeFocused();
  await editCardButton.click();
  await page.getByTestId('project-edit-title-input').fill('Edited speaking project');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByTestId('project-card-Edited speaking project')).toBeVisible();

  await page.getByTestId('project-card-Edited speaking project').dragTo(page.getByTestId('project-column-Done'));
  await expect(page.getByTestId('project-column-Done').getByTestId('project-card-Edited speaking project')).toBeVisible();

  await page.getByLabel('Delete column To Do').click();

  const movedDetail = (await (await page.request.get(`https://localhost:7000/api/v1/project/boards/${board.id}`, { headers })).json()).data;
  const movedCard = movedDetail.columns.flatMap((column) => column.cards).find((card) => card.title === 'Edited speaking project');
  const done = movedDetail.columns.find((column) => column.name === 'Done');
  expect(movedCard.columnId).toBe(done.id);

  const foreignPage = await context.newPage();
  const foreignToken = await registerAndLogin(foreignPage, 'project-foreign');
  const foreignResponse = await foreignPage.request.get(`https://localhost:7000/api/v1/project/boards/${board.id}`, {
    headers: { Cookie: `access_token=${foreignToken}` },
  });
  expect([401, 404]).toContain(foreignResponse.status());
  await foreignPage.close();

  await page.screenshot({ path: testInfo.outputPath('project-board.png'), fullPage: true });
});
