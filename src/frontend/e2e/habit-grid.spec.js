import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page) {
  const email = `habit-grid+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Habit Learner');
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
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('habit monthly grid CRUD and toggle smoke', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  await registerAndLogin(page);
  await page.getByTestId('open-habits').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/habits');
  await expect(page.getByRole('heading', { name: 'Monthly rhythm' })).toBeVisible();

  await page.getByTestId('habit-name-input').fill('Read English');
  await page.getByTestId('habit-description-input').fill('30 minutes');
  await page.getByTestId('habit-icon-input').fill('Book');
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'Read English' })).toBeVisible();

  const today = todayInput();
  await page.getByLabel(`Check Read English on ${today}`).click();
  await expect(page.getByLabel(`Uncheck Read English on ${today}`)).toBeVisible();

  await page.getByLabel('Edit Read English').click();
  await page.getByTestId('habit-name-input').fill('Read Vietnamese');
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'Read Vietnamese' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator('.habit-grid-wrap')).toBeVisible();
  const scrollable = await page.locator('.habit-grid-wrap').evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(scrollable).toBe(true);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete Read Vietnamese').click();
  await expect(page.getByRole('heading', { name: 'Read Vietnamese' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'No habits yet' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
