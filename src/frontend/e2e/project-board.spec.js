import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Project Learner');
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
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return loginPayload.data.accessToken;
}

test('Project board foundation manages boards columns cards moves and filters', async ({ context, page }, testInfo) => {
  const token = await registerAndLogin(page, 'project');
  const headers = { Authorization: `Bearer ${token}` };

  await page.getByRole('link', { name: 'Project' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/project');
  await expect(page.getByRole('heading', { level: 1, name: 'Project' })).toBeVisible();

  await page.getByTestId('project-board-name-input').fill('Launch roadmap');
  await page.getByTestId('project-board-name-input').press('Enter');
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();
  await expect(page.getByTestId('project-column-To Do')).toBeVisible();
  await expect(page.getByTestId('project-column-In Progress')).toBeVisible();
  await expect(page.getByTestId('project-column-Done')).toBeVisible();

  await page.getByTestId('project-board-name-input').fill('Archive candidate');
  await page.getByTestId('project-board-name-input').press('Enter');
  await expect(page.getByRole('heading', { name: 'Archive candidate' })).toBeVisible();
  await page.getByRole('button', { name: 'Launch roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();

  const archiveTab = page.getByRole('button', { name: 'Archive candidate' });
  await archiveTab.click({ button: 'right' });
  const deleteProjectDialog = page.getByRole('alertdialog', { name: 'Delete project?' });
  await expect(deleteProjectDialog).toContainText('Archive candidate');
  await deleteProjectDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(archiveTab).toBeVisible();
  await archiveTab.click({ button: 'right' });
  await deleteProjectDialog.getByRole('button', { name: 'Delete project' }).click();
  await expect(archiveTab).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();

  await page.getByTestId('project-board-name-input').fill('Temporary project');
  await page.getByTestId('project-board-name-input').press('Enter');
  const temporaryTab = page.getByRole('button', { name: 'Temporary project' });
  await expect(page.getByRole('heading', { name: 'Temporary project' })).toBeVisible();
  await temporaryTab.click({ button: 'right' });
  await deleteProjectDialog.getByRole('button', { name: 'Delete project' }).click();
  await expect(temporaryTab).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Launch roadmap' })).toBeVisible();

  const listResponse = await page.request.get('http://127.0.0.1:5000/api/v1/project/boards', { headers });
  expect(listResponse.status()).toBe(200);
  const boards = (await listResponse.json()).data;
  const board = boards.find((item) => item.name === 'Launch roadmap');
  expect(board).toBeTruthy();

  const detailResponse = await page.request.get(`http://127.0.0.1:5000/api/v1/project/boards/${board.id}`, { headers });
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()).data;
  expect(detail.columns.map((column) => column.name)).toEqual(['To Do', 'In Progress', 'Done']);

  await page.getByRole('button', { name: 'Add column' }).click();
  await page.getByTestId('project-column-name-input').fill('Blocked');
  await page.getByTestId('project-column-name-input').press('Enter');
  await expect(page.getByTestId('project-column-Blocked')).toBeVisible();

  await page.getByTestId('project-column-To Do').getByRole('button', { name: 'Add Card' }).click();
  const createPanel = page.getByRole('complementary', { name: 'Create card' });
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

  await page.getByLabel('Delete column To Do').click();
  await expect(page.getByText('Only empty columns can be deleted.')).toBeVisible();

  const editCardButton = page.getByRole('button', { name: 'Edit Outline speaking project' });
  await editCardButton.click();
  const editPanel = page.getByRole('complementary', { name: 'Edit card' });
  await expect(editPanel).toBeVisible();
  await expect(editPanel.getByText(/Move to/i)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(editPanel).toBeHidden();
  await expect(editCardButton).toBeFocused();
  await editCardButton.click();
  await page.getByTestId('project-edit-title-input').fill('Edited speaking project');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByTestId('project-card-Edited speaking project')).toBeVisible();

  await page.getByTestId('project-card-Edited speaking project').dragTo(page.getByTestId('project-column-In Progress'));
  await expect(page.getByTestId('project-column-In Progress').getByTestId('project-card-Edited speaking project')).toBeVisible();

  await page.getByLabel('Move Edited speaking project to column').click();
  await page.getByRole('option', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('project-column-Done').getByTestId('project-card-Edited speaking project')).toBeVisible();

  const movedDetail = (await (await page.request.get(`http://127.0.0.1:5000/api/v1/project/boards/${board.id}`, { headers })).json()).data;
  const movedCard = movedDetail.columns.flatMap((column) => column.cards).find((card) => card.title === 'Edited speaking project');
  const done = movedDetail.columns.find((column) => column.name === 'Done');
  expect(movedCard.columnId).toBe(done.id);

  const foreignPage = await context.newPage();
  const foreignToken = await registerAndLogin(foreignPage, 'project-foreign');
  const foreignResponse = await foreignPage.request.get(`http://127.0.0.1:5000/api/v1/project/boards/${board.id}`, {
    headers: { Authorization: `Bearer ${foreignToken}` },
  });
  expect(foreignResponse.status()).toBe(404);
  await foreignPage.close();

  await page.getByRole('button', { name: 'Edit Edited speaking project' }).click();
  await page.getByRole('complementary', { name: 'Edit card' }).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByTestId('project-card-Edited speaking project')).toBeHidden();
  await page.getByLabel('Delete column Blocked').click();
  await expect(page.getByTestId('project-column-Blocked')).toBeHidden();

  await page.screenshot({ path: testInfo.outputPath('project-board.png'), fullPage: true });
});
