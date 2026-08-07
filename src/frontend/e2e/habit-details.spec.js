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
  await page.getByTestId('habit-goal-days-select').click();
  await page.getByRole('option', { name: '7 days', exact: true }).click();
  await page.getByTestId('save-habit-button').click();

  await expect(page.getByRole('heading', { name: 'Read Details' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Total check-ins: 0 Days' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Monthly check-in rate: 0 %' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Current streak: 0 Days' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Longest streak: 0 Days' })).toBeVisible();
  await expect(page.getByLabel('Goal progress 0 of 7')).toBeVisible();
  expect(await page.locator('.habit-description-card p').evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await page.getByRole('heading', { name: 'Read Details' }).evaluate((element) => getComputedStyle(element).fontSize)).toBe('22px');
  expect(await page.locator('.habit-stats-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(4);
  expect(await page.locator('.habit-stat-card').first().evaluate((element) => getComputedStyle(element).flexDirection)).toBe('row');
  expect(await page.locator('.habit-stat-value').first().evaluate((element) => getComputedStyle(element).fontSize)).toBe('17px');
  expect(await page.locator('.habit-description-card p').evaluate((element) => getComputedStyle(element).fontSize)).toBe('15px');
  expect(await page.locator('.habit-calendar-header h4').evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');

  const today = todayInput();
  await page.getByLabel(`Check Read Details for selected date ${today}`).click();
  await expect(page.getByLabel('Goal progress 1 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Read Details' }).click();
  await expect(page.getByTestId('habit-start-date-input')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Delete Read Details' }).click();
  const deleteDialog = page.getByRole('alertdialog', { name: 'Delete Habit?' });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText('Read Details');
  await expect(deleteDialog).toContainText('check-in history');
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Read Details' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Read Details' }).click();
  await page.getByRole('alertdialog', { name: 'Delete Habit?' }).getByRole('button', { name: 'Delete Habit' }).click();
  await expect(page.getByText("No habits yet. Let's build a new one!")).toBeVisible();

  await page.evaluate(() => {
    window.history.pushState({}, '', '/habits/route-proof/stats');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await expect(page.getByText('Review queue')).toBeVisible();
});
