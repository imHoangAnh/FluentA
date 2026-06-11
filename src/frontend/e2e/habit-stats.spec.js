import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function registerAndLogin(page) {
  const email = `habit-stats+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Habit Stats Learner');
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
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('habit stats page shows backend-owned streak and rolling rates', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text() !== 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
      consoleErrors.push(message.text());
    }
  });

  await registerAndLogin(page);
  await page.getByTestId('open-habits').click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/habits');

  await page.getByTestId('habit-name-input').fill('Read Stats');
  await page.getByTestId('habit-description-input').fill('One measured habit');
  await page.getByTestId('save-habit-button').click();
  await expect(page.getByRole('heading', { name: 'Read Stats' })).toBeVisible();

  const today = todayInput();
  await page.getByLabel(`Check Read Stats on ${today}`).click();
  await expect(page.getByLabel(`Uncheck Read Stats on ${today}`)).toBeVisible();

  await page.getByRole('link', { name: 'View stats for Read Stats' }).click();
  await expect(page).toHaveURL(/\/habits\/.+\/stats$/);
  await expect(page.getByRole('heading', { name: 'Read Stats' })).toBeVisible();
  await expect(page.getByText('Current streak')).toBeVisible();
  await expect(page.getByText('Longest streak')).toBeVisible();
  await expect(page.getByText('1 days')).toHaveCount(2);
  await expect(page.getByText('1/7 scheduled days complete')).toBeVisible();
  await expect(page.getByText('1/30 scheduled days complete')).toBeVisible();
  await page.getByRole('link', { name: 'Back to monthly grid' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/habits');
  expect(consoleErrors).toEqual([]);
});
