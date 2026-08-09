import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

const apiUrl = process.env.E2E_API_URL ?? 'https://localhost:7000/api/v1';

function todayInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page, prefix) {
  const identity = await loginSeededUser(page, { prefix: prefix ?? 'todo-daily-foundation' });
  return identity;
}

test('My Day core persists details and keeps task mutation owner-scoped', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'todo');
  const headers = { Cookie: `access_token=${token}` };

  await page.getByRole('link', { name: 'Todo' }).click();
  await expect(page).toHaveURL('/todo');
  await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My Day menu' })).toBeVisible();
  await expect(page.getByText('Grid')).toHaveCount(0);
  await expect(page.getByText('Group')).toHaveCount(0);
  await expect(page.getByText('Suggestions')).toHaveCount(0);

  await page.getByTestId('todo-title-input').fill('Review IELTS Unit 3');
  await page.getByTestId('todo-title-input').press('Enter');
  const details = page.getByLabel('Details for Review IELTS Unit 3');
  await expect(details).toBeVisible();
  await expect(details.getByLabel('Task title')).toBeFocused();

  const notePatch = page.waitForResponse((response) => response.url().includes('/api/v1/todos/') && response.request().method() === 'PATCH');
  await details.getByLabel('Note').fill('Focus on listening');
  await details.getByLabel('Note').blur();
  await notePatch;
  const importantPatch = page.waitForResponse((response) => response.url().includes('/api/v1/todos/') && response.request().method() === 'PATCH');
  await details.getByRole('button', { name: 'Mark as important' }).click();
  await importantPatch;
  await expect(page.getByRole('button', { name: 'Remove importance from Review IELTS Unit 3' })).toBeVisible();

  await page.reload();
  const taskTitle = page.getByRole('button', { name: 'Review IELTS Unit 3', exact: true });
  await taskTitle.click();
  await expect(details.getByRole('textbox', { name: 'Note' })).toHaveValue('Focus on listening');
  await expect(details.getByRole('button', { name: 'Remove importance' })).toBeVisible();

  await taskTitle.press('Shift+F10');
  const contextMenu = page.getByRole('menu', { name: 'Actions for Review IELTS Unit 3' });
  await expect(contextMenu.getByRole('menuitem')).toHaveCount(3);
  await expect(contextMenu.getByRole('menuitem', { name: 'Mark as completed' })).toBeVisible();
  await expect(contextMenu.getByRole('menuitem', { name: 'Remove importance' })).toBeVisible();
  await expect(contextMenu.getByRole('menuitem', { name: 'Delete task' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(details).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await taskTitle.click();

  await details.getByRole('button', { name: 'Mark Review IELTS Unit 3 as completed' }).click();
  await expect(details).toBeVisible();
  await page.getByRole('button', { name: /Completed/ }).click();
  await expect(page.getByTestId(/todo-row-/).filter({ hasText: 'Review IELTS Unit 3' })).toHaveClass(/todo-my-day-row--completed/);

  await details.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('button', { name: 'Review IELTS Unit 3', exact: true })).toHaveCount(0);

  const owned = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: { title: 'Owned API task', date: todayInput() },
  })).json()).data;

  const second = await registerAndLogin(page, 'todo-foreign');
  const foreign = await page.request.patch(`${apiUrl}/todos/${owned.id}`, {
    headers: { Cookie: `access_token=${second.token}` },
    data: { isCompleted: false },
  });
  expect(foreign.status()).toBe(404);
});

test('My Day keeps details side-by-side without page overflow at supported widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await registerAndLogin(page, 'todo-narrow');
  await page.getByRole('link', { name: 'Todo' }).click();
  await page.getByTestId('todo-title-input').fill('Narrow layout task');
  await page.getByTestId('todo-title-input').press('Enter');
  await expect(page.getByLabel('Details for Narrow layout task')).toBeVisible();

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      list: document.querySelector('.todo-my-day')?.getBoundingClientRect().width ?? 0,
      details: document.querySelector('.todo-details')?.getBoundingClientRect().width ?? 0,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.list).toBeGreaterThan(0);
    expect(widths.details).toBeGreaterThan(0);
    if (width === 1440) {
      const detailsShare = widths.details / (widths.list + widths.details);
      expect(detailsShare).toBeGreaterThanOrEqual(0.16);
      expect(detailsShare).toBeLessThanOrEqual(0.23);
    }
    await page.screenshot({ path: testInfo.outputPath(`my-day-${width}.png`), fullPage: true });
  }
});

test('automatic My Day sort becomes persisted manual order when keyboard drag starts', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'todo-sort');
  const headers = { Cookie: `access_token=${token}` };
  await page.request.post(`${apiUrl}/todos`, { headers, data: { title: 'Zulu task', date: todayInput() } });
  await page.request.post(`${apiUrl}/todos`, { headers, data: { title: 'Alpha task', date: todayInput() } });

  await page.getByRole('link', { name: 'Todo' }).click();
  await page.getByRole('button', { name: 'Sort My Day tasks' }).click();
  await page.getByRole('menuitem', { name: 'Alphabetically' }).click();
  await expect(page.getByRole('button', { name: 'Sort My Day tasks' })).toContainText('Alphabetically');
  await expect(page.locator('.todo-my-day-row__title')).toHaveText(['Alpha task', 'Zulu task']);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sort My Day tasks' })).toContainText('Alphabetically');
  const zulu = page.getByRole('button', { name: 'Zulu task', exact: true });
  await zulu.focus();
  await zulu.press('Space');
  await zulu.press('ArrowUp');
  await zulu.press('Space');

  await expect(page.getByRole('button', { name: 'Sort My Day tasks' })).toContainText(/Sort|Alphabetically/);
  await expect(page.locator('.todo-my-day-row__title')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fluenta.todo.my-day-sort.v1'))).toBeNull();

  await page.reload();
  await expect(page.locator('.todo-my-day-row__title')).toHaveCount(2);
});

test('repeat lifecycle creates one occurrence and safely handles both reopen branches', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'todo-repeat');
  const headers = { Cookie: `access_token=${token}` };
  const tomorrow = todayInput(1);
  const concurrentDate = todayInput(2);
  const concurrentNextDate = todayInput(3);

  const concurrentSource = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: { title: 'Concurrent recurrence proof', date: concurrentDate, repeatPattern: 'Daily' },
  })).json()).data;
  const concurrentResponses = await Promise.all(Array.from({ length: 6 }, () => page.request.patch(
    `${apiUrl}/todos/${concurrentSource.id}`,
    { headers, data: { isCompleted: true } },
  )));
  expect(concurrentResponses.map((response) => response.status())).toEqual([200, 200, 200, 200, 200, 200]);
  const concurrentChildren = (await (await page.request.get(
    `${apiUrl}/todos?date=${concurrentNextDate}`,
    { headers },
  )).json()).data;
  expect(concurrentChildren.filter((item) => item.title === 'Concurrent recurrence proof')).toHaveLength(1);

  await page.getByRole('link', { name: 'Todo' }).click();
  await page.getByTestId('todo-title-input').fill('Recurrence proof');
  await page.getByTestId('todo-title-input').press('Enter');
  const details = page.getByLabel('Details for Recurrence proof');

  await details.getByRole('button', { name: 'Repeat: Does not repeat' }).click();
  const repeatMenu = page.getByRole('menu');
  await expect(repeatMenu.getByRole('menuitem')).toHaveText([
    'Does not repeat',
    'Daily',
    'Weekdays',
    'Weekly',
    'Monthly',
    'Yearly',
  ]);
  await repeatMenu.getByRole('menuitem', { name: 'Daily' }).click();
  await expect(details.getByRole('button', { name: 'Repeat: Daily' })).toBeVisible();
  await expect(page.getByTestId(/todo-row-/).filter({ hasText: 'Recurrence proof' })).not.toContainText('Daily');

  await details.getByRole('button', { name: 'Mark Recurrence proof as completed' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${tomorrow}`, { headers });
    return (await response.json()).data;
  }).toHaveLength(1);

  await details.getByRole('button', { name: 'Mark Recurrence proof as active' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${tomorrow}`, { headers });
    return (await response.json()).data;
  }).toHaveLength(0);

  await details.getByRole('button', { name: 'Mark Recurrence proof as completed' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${tomorrow}`, { headers });
    return (await response.json()).data;
  }).toHaveLength(1);
  const generatedResponse = await page.request.get(`${apiUrl}/todos?date=${tomorrow}`, { headers });
  const generatedItem = (await generatedResponse.json()).data[0];
  await page.request.patch(`${apiUrl}/todos/${generatedItem.id}`, {
    headers,
    data: { title: 'Edited generated occurrence' },
  });

  await details.getByRole('button', { name: 'Mark Recurrence proof as active' }).click();
  await expect(page.getByText('The edited next occurrence was kept. Both tasks now exist.')).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${tomorrow}`, { headers });
    return (await response.json()).data.map((item) => item.title);
  }).toEqual(['Edited generated occurrence']);
});
