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
  await page.locator('input[name="password"]').fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const payload = await (await responsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: payload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

test('semantic icon and selected-week Habit layout work on desktop and tablet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await registerAndLogin(page);
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/habits');

  const createHabitButton = page.getByRole('button', { name: 'Create habit' });
  await createHabitButton.click();
  await expect(page.getByRole('dialog', { name: 'Create Habit' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Create Habit' })).toBeHidden();
  await expect(createHabitButton).toBeFocused();
  await createHabitButton.click();
  await page.getByTestId('habit-name-input').fill('Read English');
  await page.getByTestId('habit-description-input').fill('30 focused minutes');
  await expect(page.getByTestId('habit-start-date-input')).toHaveValue(todayInput());
  await page.getByTestId('habit-goal-days-select').selectOption('21');
  await page.getByTestId('habit-reminder-time-input').fill('07:30');
  await page.getByRole('button', { name: 'Habit icon' }).click();
  const iconOptions = page.locator('.habit-icon-options').getByRole('option');
  await expect(iconOptions).toHaveCount(8);
  await page.locator('.habit-icon-options').getByRole('option', { name: 'Book' }).click();
  await page.getByTestId('save-habit-button').click();

  await expect(page.getByRole('heading', { name: 'Read English' })).toBeVisible();
  await expect(page.getByText('30 focused minutes')).toBeVisible();
  await expect(page.locator('.habit-list-card .habit-list-card-toggle')).toHaveCount(1);
  await expect(page.locator('.habit-week-day-button')).toHaveCount(7);

  const today = todayInput();
  await page.getByLabel(`Check Read English for selected date ${today}`).click();
  await expect(page.getByLabel(`Uncheck Read English for selected date ${today}`)).toBeVisible();
  await expect(page.getByLabel(/Goal progress 1 of 21/)).toBeVisible();

  const initialRange = await page.locator('.habit-week-navigation strong').textContent();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page.locator('.habit-week-navigation strong')).not.toHaveText(initialRange ?? '');
  await page.locator('.habit-week-day-button').first().click();
  await expect(page.locator('.habit-list-card-toggle')).toBeDisabled();
  await page.getByRole('button', { name: 'Previous week' }).click();

  const desktopSidebar = await page.locator('.habit-tracker-sidebar').boundingBox();
  const desktopDetails = await page.locator('.habit-tracker-details').boundingBox();
  expect(Math.abs((desktopSidebar?.width ?? 0) - (desktopDetails?.width ?? 0))).toBeLessThan(4);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('.habit-tracker-sidebar')).toBeVisible();
  await expect(page.locator('.habit-tracker-details')).toBeVisible();
  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasPageOverflow).toBe(false);
});
