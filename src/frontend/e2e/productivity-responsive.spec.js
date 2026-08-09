import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'productivity-responsive' });
  return identity;
}

const productivityRoutes = [
  { path: '/todo', title: 'Todo' },
  { path: '/habits', title: 'Habits' },
  { path: '/countdowns', title: 'Countdowns' },
  { path: '/project', title: 'Project' },
  { path: '/pomodoro', title: 'Pomodoro' },
];

test('productivity routes avoid page overflow at desktop and tablet widths', async ({ page }, testInfo) => {
  await registerAndLogin(page);

  await page.getByRole('link', { name: 'Project', exact: true }).click();
  await expect(page).toHaveURL('/project');
  await page.getByTestId('project-empty-new-project').click();
  await page.getByTestId('project-empty-project-input').fill('Responsive board');
  await page.getByTestId('project-empty-project-input').press('Enter');
  await expect(page.getByTestId('project-column-Done')).toBeVisible();

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 900 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of productivityRoutes) {
      await page.getByRole('link', { name: route.title, exact: true }).click();
      await expect(page).toHaveURL(`${route.path}`);
      await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible();
      if (route.path === '/project') {
        await page.getByTestId('project-column-To Do').getByRole('button', { name: 'Add Card' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route.path} should not overflow at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
      await page.screenshot({ path: testInfo.outputPath(`${route.title.toLowerCase()}-${viewport.name}.png`) });
      if (route.path === '/project') {
        await page.getByRole('button', { name: 'Close card details' }).click();
      }
    }
  }
});
