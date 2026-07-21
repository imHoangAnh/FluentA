import { expect, test } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:5000/api/v1';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5173';

function dateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWeekDates() {
  const today = new Date();
  const offsetToMonday = ((8 - today.getDay()) % 7) || 7;
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + offsetToMonday);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    return dateInput(date);
  });
  return {
    all: dates,
    monday: dates[0],
    tuesday: dates[1],
    wednesday: dates[2],
    sunday: dates[6],
  };
}

function formatRange(startValue, endValue) {
  const local = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const start = local(startValue);
  const end = local(endValue);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' });
  if (start.getMonth() === end.getMonth()) {
    return `${month.format(start)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${month.format(start)} ${start.getDate()}–${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto(`${webUrl}/register`);
  await page.getByLabel('Full name').fill('Todo Week Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post(`${apiUrl}/auth/verify-email`, {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto(`${webUrl}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  return { token: loginPayload.data.accessToken };
}

async function dragWithMouse(page, source, target) {
  const sourceRow = source.locator('xpath=ancestor::article');
  await sourceRow.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await sourceRow.dispatchEvent('dragstart', { dataTransfer });
  await expect(sourceRow).toHaveClass(/todo-week-row--dragging/);
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await sourceRow.dispatchEvent('dragend', { dataTransfer });
}

test('todo Week v2 keeps its compact layout and durable task lifecycle', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { token } = await registerAndLogin(page, 'todo-week-v2');
  const headers = { Authorization: `Bearer ${token}` };
  const dates = nextWeekDates();

  const first = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: {
      title: 'First Monday',
      date: dates.monday,
      note: 'Preserve me',
      isImportant: true,
      repeatPattern: 'Weekly',
      reminder: {
        time: '10:30',
        timeZoneId: 'UTC',
        scheduledAtUtc: `${dates.monday}T10:30:00.000Z`,
      },
    },
  })).json()).data;
  const second = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: { title: 'Second Monday', date: dates.monday },
  })).json()).data;
  const tuesday = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: { title: 'Tuesday task', date: dates.tuesday },
  })).json()).data;
  const longTitle = 'Prepare a deliberately long speaking-practice task title that must wrap cleanly inside one weekday column';
  const longTask = (await (await page.request.post(`${apiUrl}/todos`, {
    headers,
    data: { title: longTitle, date: dates.wednesday },
  })).json()).data;

  await page.getByRole('link', { name: 'Todo' }).click();
  await page.getByRole('button', { name: 'My Day menu' }).click();
  await page.getByRole('menuitem', { name: 'Week' }).click();
  await page.getByRole('button', { name: 'Next week' }).click();

  await expect(page.getByRole('heading', { name: 'Week' })).toBeVisible();
  await expect(page.getByText(formatRange(dates.monday, dates.sunday), { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Todo week' })).toBeVisible();
  await expect(page.locator('[data-testid^="week-day-"]')).toHaveCount(7);
  await expect(page.getByPlaceholder('Add a task')).toHaveCount(7);
  await expect(page.locator('.todo-week-day__header')).toHaveText([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  ]);

  const columnWidths = await page.locator('.todo-week-day').evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().width));
  expect(Math.max(...columnWidths) - Math.min(...columnWidths)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId(`week-todo-${first.id}`).getByText('Preserve me')).toHaveCount(0);
  await expect(page.getByTestId(`week-todo-${first.id}`).getByText('Weekly')).toHaveCount(0);
  await expect(page.getByTestId(`week-todo-${first.id}`).getByText('10:30')).toHaveCount(0);
  await expect(page.getByTestId(`week-todo-${first.id}`).getByRole('button', { name: 'Remove importance from First Monday' })).toBeVisible();

  const longTitleGeometry = await page.getByTestId(`week-todo-${longTask.id}`).getByRole('button', { name: longTitle, exact: true }).evaluate((button) => ({
    height: button.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(button).lineHeight),
    whiteSpace: getComputedStyle(button).whiteSpace,
  }));
  expect(longTitleGeometry.whiteSpace).toBe('normal');
  expect(longTitleGeometry.height).toBeGreaterThan(longTitleGeometry.lineHeight * 2);

  await dragWithMouse(page, page.getByRole('button', { name: 'Second Monday', exact: true }), page.getByTestId(`week-todo-${first.id}`));
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?startDate=${dates.monday}&endDate=${dates.sunday}`, { headers });
    const mondayItems = (await response.json()).data.filter((item) => item.date === dates.monday);
    return mondayItems.map((item) => item.title);
  }).toEqual(['Second Monday', 'First Monday']);

  await dragWithMouse(page, page.getByRole('button', { name: 'First Monday', exact: true }), page.getByTestId(`week-todo-${tuesday.id}`));
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?startDate=${dates.monday}&endDate=${dates.sunday}`, { headers });
    const weekItems = (await response.json()).data;
    const moved = weekItems.find((item) => item.id === first.id);
    return { date: moved?.date, note: moved?.note };
  }).toEqual({ date: dates.tuesday, note: 'Preserve me' });

  const mondayQuickAdd = page.getByLabel('Add a task for Monday');
  await mondayQuickAdd.fill('Created in Monday');
  await mondayQuickAdd.press('Enter');
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${dates.monday}`, { headers });
    return (await response.json()).data.some((item) => item.title === 'Created in Monday');
  }).toBe(true);
  await expect(page.getByLabel('Details for Created in Monday')).toHaveCount(0);

  await page.getByTestId(`week-todo-${first.id}`).getByRole('button', { name: 'First Monday', exact: true }).click();
  const details = page.getByLabel('Details for First Monday');
  await expect(details).toBeVisible();
  await expect(details.getByLabel('Note')).toHaveValue('Preserve me');
  const layoutGeometry = await page.locator('.todo-main-layout--week-details').evaluate((layout) => {
    const board = layout.querySelector('.todo-week-surface').getBoundingClientRect();
    const panel = layout.querySelector('.todo-details').getBoundingClientRect();
    return {
      boardWidth: board.width,
      ratio: board.width / panel.width,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layoutGeometry.ratio).toBeGreaterThan(3.8);
  expect(layoutGeometry.ratio).toBeLessThan(4.2);
  expect(layoutGeometry.pageOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('week-v2-details-open-1440.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(details).toHaveCount(0);
  const closedBoardWidth = await page.locator('.todo-week-surface').evaluate((surface) => surface.getBoundingClientRect().width);
  expect(closedBoardWidth).toBeGreaterThan(layoutGeometry.boardWidth);
  await page.screenshot({ path: testInfo.outputPath('week-v2-details-closed-1440.png'), fullPage: true });

  const firstRow = page.getByTestId(`week-todo-${first.id}`);
  await firstRow.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicate task' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${dates.tuesday}`, { headers });
    const dayItems = (await response.json()).data;
    return dayItems.find((item) => item.id !== first.id && item.title === 'First Monday') ?? null;
  }).not.toBeNull();
  const duplicateResponse = await page.request.get(`${apiUrl}/todos?date=${dates.tuesday}`, { headers });
  const duplicateItem = (await duplicateResponse.json()).data.find((item) => item.id !== first.id && item.title === 'First Monday');
  expect(duplicateItem).toMatchObject({
    title: 'First Monday',
    note: 'Preserve me',
    date: dates.tuesday,
    isCompleted: false,
    isImportant: true,
    repeatPattern: 'Weekly',
    reminder: {
      time: '10:30',
      timeZoneId: 'UTC',
      scheduledAtUtc: `${dates.tuesday}T10:30:00Z`,
      sentAtUtc: null,
    },
  });
  expect(duplicateItem.id).not.toBe(first.id);

  const tuesdayRow = page.getByTestId(`week-todo-${tuesday.id}`);
  await tuesdayRow.focus();
  await tuesdayRow.press('Shift+F10');
  const moveMenu = page.getByRole('menuitem', { name: 'Move task to...' });
  await expect(moveMenu).toBeVisible();
  await moveMenu.hover();
  await page.getByRole('menuitem', { name: 'Move to Wednesday' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?startDate=${dates.monday}&endDate=${dates.sunday}`, { headers });
    return (await response.json()).data.find((item) => item.id === tuesday.id)?.date;
  }).toBe(dates.wednesday);

  const secondRow = page.getByTestId(`week-todo-${second.id}`);
  await secondRow.getByRole('button', { name: 'Mark Second Monday as important' }).click();
  await secondRow.getByRole('button', { name: 'Mark Second Monday as completed' }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${apiUrl}/todos?date=${dates.monday}`, { headers });
    const updated = (await response.json()).data.find((item) => item.id === second.id);
    return { isImportant: updated?.isImportant, isCompleted: updated?.isCompleted };
  }).toEqual({ isImportant: true, isCompleted: true });

  const createdRow = page.getByRole('button', { name: 'Created in Monday', exact: true }).locator('xpath=ancestor::article');
  await createdRow.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete task' }).click();
  const deleteDialog = page.getByRole('alertdialog', { name: 'Delete task?' });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('button', { name: 'Created in Monday', exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByTestId(`week-todo-${first.id}`).getByRole('button', { name: 'First Monday', exact: true }).click();
  const narrowGeometry = await page.locator('.todo-week-surface').evaluate((surface) => ({
    localOverflow: surface.scrollWidth - surface.clientWidth,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(narrowGeometry.localOverflow).toBeGreaterThan(0);
  expect(narrowGeometry.pageOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('week-v2-details-open-1024.png'), fullPage: true });
});
