import { expect, test } from '@playwright/test';

function todayInput() {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function registerAndLogin(page) {
  const email = `habit-details+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';
  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Habit Details Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registration = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const payload = await (await registration).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', { data: { email, otp: payload.data.developmentOtp } });
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('main Habit details owns stats, goal progress, scrolling description, and route retirement', async ({ page }) => {
  await registerAndLogin(page);
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('button', { name: 'Create habit' }).click();
  await page.getByTestId('habit-name-input').fill('Read Details');
  await page.getByTestId('habit-description-input').fill(Array.from({ length: 18 }, (_, index) => `Description line ${index + 1} with averylongunbrokentokenthatmustwrap`).join('\n'));
  await page.getByTestId('habit-goal-days-select').selectOption('7');
  await page.getByTestId('save-habit-button').click();

  await expect(page.getByRole('heading', { name: 'Read Details' })).toBeVisible();
  await expect(page.getByText('Total check-ins')).toBeVisible();
  await expect(page.getByText('Monthly check-in rate')).toBeVisible();
  await expect(page.getByText('Current streak')).toBeVisible();
  await expect(page.getByText('Longest streak')).toBeVisible();
  await expect(page.getByLabel('Goal progress 0 of 7')).toBeVisible();
  expect(await page.locator('.habit-description-card p').evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

  const today = todayInput();
  await page.getByLabel(`Check Read Details for selected date ${today}`).click();
  await expect(page.getByLabel('Goal progress 1 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Read Details' }).click();
  await expect(page.getByTestId('habit-start-date-input')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.evaluate(() => {
    window.history.pushState({}, '', '/habits/route-proof/stats');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await expect(page.getByText('Review queue')).toBeVisible();
});
