import { expect, test } from '@playwright/test';

function dateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWeekDates() {
  const today = new Date();
  const offsetToMonday = ((8 - today.getDay()) % 7) || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offsetToMonday);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday: dateInput(monday), tuesday: dateInput(tuesday), sunday: dateInput(sunday) };
}

async function registerAndLogin(page, prefix) {
  const email = `${prefix}+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Todo Week Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  return { token: loginPayload.data.accessToken };
}

async function dragWithMouse(page, source, target) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Drag source or target is not visible');

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 3;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 12, sourceY + 12, { steps: 3 });
  await expect(source.locator('xpath=ancestor::article')).toHaveClass(/todo-week-card--dragging/);
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test('todo week view reorders and moves tasks on desktop', async ({ page }) => {
  const { token } = await registerAndLogin(page, 'todo-week');
  const headers = { Authorization: `Bearer ${token}` };
  const dates = nextWeekDates();

  const first = (await (await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'First Monday', date: dates.monday, note: 'Preserve me' },
  })).json()).data;
  const second = (await (await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'Second Monday', date: dates.monday },
  })).json()).data;
  const tuesday = (await (await page.request.post('http://127.0.0.1:5000/api/v1/todos', {
    headers,
    data: { title: 'Tuesday task', date: dates.tuesday },
  })).json()).data;

  await page.getByTestId('open-todo').click();
  await page.getByRole('button', { name: 'Week' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { name: 'Week plan' })).toBeVisible();
  await expect(page.locator('[data-testid^="week-day-"]')).toHaveCount(7);
  await expect(page.getByTestId(`week-todo-${first.id}`)).toBeVisible();
  await expect(page.getByTestId(`week-todo-${second.id}`)).toBeVisible();

  await dragWithMouse(page, page.getByLabel('Drag Second Monday'), page.getByTestId(`week-todo-${first.id}`));

  await expect.poll(async () => {
    const response = await page.request.get(`http://127.0.0.1:5000/api/v1/todos?startDate=${dates.monday}&endDate=${dates.sunday}`, { headers });
    const items = (await response.json()).data.filter((item) => item.date === dates.monday);
    return items.map((item) => item.title);
  }).toEqual(['Second Monday', 'First Monday']);

  await dragWithMouse(page, page.getByLabel('Drag First Monday'), page.getByTestId(`week-todo-${tuesday.id}`));

  await expect.poll(async () => {
    const response = await page.request.get(`http://127.0.0.1:5000/api/v1/todos?startDate=${dates.monday}&endDate=${dates.sunday}`, { headers });
    const items = (await response.json()).data;
    const moved = items.find((item) => item.id === first.id);
    const tuesdayItems = items.filter((item) => item.date === dates.tuesday);
    return {
      movedDate: moved?.date,
      movedNote: moved?.note,
      tuesdayTitles: tuesdayItems.map((item) => item.title),
    };
  }).toEqual({
    movedDate: dates.tuesday,
    movedNote: 'Preserve me',
    tuesdayTitles: ['First Monday', 'Tuesday task'],
  });

  await expect(page.getByTestId(`week-day-${dates.tuesday}`).getByText('First Monday')).toBeVisible();
});
