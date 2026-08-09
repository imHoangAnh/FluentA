import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'project-sync' });
  return identity;
}

async function login(page, email, password) {
  return loginSeededUser(page, { email, password });
}

test('ProjectCardMoved syncs card movement across same-user tabs', async ({ context, page }) => {
  const consoleErrors = [];
  const collectConsoleError = (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  };
  page.on('console', collectConsoleError);

  const { email, password } = await registerAndLogin(page, 'project-sync');

  await page.getByRole('link', { name: 'Project' }).click();
  await page.getByTestId('project-empty-new-project').click();
  await page.getByTestId('project-empty-project-input').fill('Sync board');
  await page.getByTestId('project-empty-project-input').press('Enter');
  await expect(page.getByTestId('project-column-To Do')).toBeVisible();
  await expect(page.getByTestId('project-column-In Progress')).toBeVisible();

  await page.getByTestId('project-column-To Do').getByRole('button', { name: 'Add Card' }).click();
  await page.getByTestId('project-edit-title-input').fill('Move me live');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByTestId('project-column-To Do').getByTestId('project-card-Move me live')).toBeVisible();

  const secondTab = await context.newPage();
  secondTab.on('console', collectConsoleError);
  const secondTabHubSockets = [];
  secondTab.on('websocket', (socket) => {
    if (socket.url().includes('/hubs/sync')) {
      secondTabHubSockets.push(socket.url());
    }
  });
  const secondTabProjectResponses = [];
  secondTab.on('response', (response) => {
    if (response.request().method() === 'GET' && response.url().includes('/api/v1/project/boards')) {
      secondTabProjectResponses.push(response.url());
    }
  });
  await login(secondTab, email, password);
  await secondTab.getByRole('link', { name: 'Project' }).click();
  await expect(secondTab.getByTestId('project-column-To Do').getByTestId('project-card-Move me live')).toBeVisible({ timeout: 15_000 });
  await expect(secondTab.getByTestId('project-column-In Progress').getByTestId('project-card-Move me live')).toHaveCount(0);
  await expect.poll(() => secondTabHubSockets.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);

  const responseCountBeforeMove = secondTabProjectResponses.length;

  await page.getByTestId('project-card-Move me live').dragTo(page.getByTestId('project-column-In Progress'));
  await expect(page.getByTestId('project-column-In Progress').getByTestId('project-card-Move me live')).toBeVisible();
  await expect(secondTab.getByTestId('project-column-In Progress').getByTestId('project-card-Move me live')).toBeVisible();
  expect(secondTabProjectResponses.length).toBeGreaterThan(responseCountBeforeMove);
  expect(consoleErrors).toEqual([]);
});
