import { expect, test } from '@playwright/test';

async function registerAndLogin(page) {
  const email = `productivity-responsive+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Responsive Learner');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
}

const productivityRoutes = [
  { path: '/todo', title: 'Todo' },
  { path: '/habits', title: 'Habits' },
  { path: '/countdowns', title: 'Countdowns' },
  { path: '/kanban', title: 'Kanban' },
  { path: '/pomodoro', title: 'Pomodoro' },
];

test('productivity routes avoid page overflow at desktop and tablet widths', async ({ page }, testInfo) => {
  await registerAndLogin(page);

  await page.goto('http://127.0.0.1:5173/kanban');
  await page.getByTestId('kanban-board-name-input').fill('Responsive board');
  await page.getByTestId('kanban-board-name-input').press('Enter');
  await expect(page.getByTestId('kanban-column-Done')).toBeVisible();

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 900 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of productivityRoutes) {
      await page.goto(`http://127.0.0.1:5173${route.path}`);
      await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route.path} should not overflow at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
      await page.screenshot({ path: testInfo.outputPath(`${route.title.toLowerCase()}-${viewport.name}.png`) });
    }
  }
});
