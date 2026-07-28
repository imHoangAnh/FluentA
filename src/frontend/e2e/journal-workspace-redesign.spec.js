import { expect, test } from '@playwright/test';

async function registerAndLogin(page) {
  const email = `journal-workspace+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Journal Workspace Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const loginPayload = await (await loginResponsePromise).json();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  return loginPayload.data.accessToken;
}

test('Journal uses the approved full-width hierarchy without responsive overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const token = await registerAndLogin(page);
  const title = `Workspace proof ${crypto.randomUUID().slice(0, 8)}`;
  const createResponse = await page.request.post('http://127.0.0.1:5000/api/v1/journal', {
    data: {
      title,
      date: '2026-07-22',
      content: '<p>Responsive Journal workspace proof.</p>',
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/journal');
  await expect(page.getByText('My Journal', { exact: true })).toHaveCount(0);

  const search = page.getByTestId('journal-search-input');
  const workspace = page.getByTestId('journal-workspace');
  const entryButton = page.getByRole('button', { name: `Open journal ${title}` });
  await expect(search).toBeVisible();
  await expect(workspace).toBeVisible();
  await expect(entryButton).toBeVisible();
  await expect(entryButton.getByText('ENTRY', { exact: true })).toHaveCount(0);
  await expect(entryButton.getByText(title, { exact: true })).toHaveCount(1);
  await expect(entryButton.getByTestId('journal-entry-date')).not.toBeEmpty();

  await entryButton.click();
  const editorHeader = page.getByTestId('journal-editor-header');
  const titleInput = editorHeader.getByLabel('Journal title');
  const dateInput = editorHeader.getByLabel('Journal date');
  const actions = editorHeader.getByTestId('journal-editor-actions');
  const saveButton = actions.getByTestId('save-journal-button');
  const deleteButton = actions.getByRole('button', { name: `Delete journal ${title}` });
  const editorBody = page.getByTestId('journal-editor-body');
  const toolbar = editorBody.getByRole('toolbar', { name: 'Journal formatting tools' });
  const writingSurface = editorBody.getByLabel('Journal rich text editor');

  await expect(titleInput).toHaveValue(title);
  await expect(dateInput).toHaveValue('2026-07-22');
  await expect(actions.getByTestId('journal-save-status')).toHaveText('Saved');
  await expect(toolbar).toBeVisible();
  await expect(writingSurface).toBeVisible();
  await expect(page.locator('.journal-editor-footer')).toHaveCount(0);

  const hierarchyIsCorrect = await page.evaluate(() => {
    const searchInput = document.querySelector('[data-testid="journal-search-input"]');
    const workspaceElement = document.querySelector('[data-testid="journal-workspace"]');
    const titleElement = document.querySelector('[data-testid="journal-title-input"]');
    const dateElement = document.querySelector('[data-testid="journal-date-input"]');
    const saveElement = document.querySelector('[data-testid="save-journal-button"]');
    const deleteElement = document.querySelector('[aria-label^="Delete journal"]');
    const headerElement = document.querySelector('[data-testid="journal-editor-header"]');
    const toolbarElement = document.querySelector('[role="toolbar"]');
    const writingElement = document.querySelector('[aria-label="Journal rich text editor"]');
    const follows = (first, second) => Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING));
    return follows(searchInput, workspaceElement)
      && follows(titleElement, dateElement)
      && follows(saveElement, deleteElement)
      && follows(headerElement, toolbarElement)
      && follows(toolbarElement, writingElement);
  });
  expect(hierarchyIsCorrect).toBeTruthy();

  await writingSurface.focus();
  const editorBorders = await page.locator('.journal-editor-inner .journal-rich-text-shell').evaluate((shell) => {
    const shellStyle = getComputedStyle(shell);
    const surface = shell.querySelector('[aria-label="Journal rich text editor"]');
    const surfaceStyle = surface ? getComputedStyle(surface) : null;
    return {
      shellBorder: [shellStyle.borderTopWidth, shellStyle.borderRightWidth, shellStyle.borderBottomWidth, shellStyle.borderLeftWidth],
      shellOutline: shellStyle.outlineStyle,
      surfaceBorder: surfaceStyle
        ? [surfaceStyle.borderTopWidth, surfaceStyle.borderRightWidth, surfaceStyle.borderBottomWidth, surfaceStyle.borderLeftWidth]
        : [],
      surfaceOutline: surfaceStyle?.outlineStyle,
    };
  });
  expect(editorBorders.shellBorder).toEqual(['0px', '0px', '0px', '0px']);
  expect(editorBorders.surfaceBorder).toEqual(['0px', '0px', '0px', '0px']);
  expect(editorBorders.shellOutline).toBe('none');
  expect(editorBorders.surfaceOutline).toBe('none');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 800 },
    { width: 768, height: 900 },
    { width: 320, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(search).toBeVisible();
    await expect(page.getByLabel('Journal date calendar')).toBeVisible();
    await expect(entryButton).toBeVisible();
    await expect(editorHeader).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(writingSurface).toBeVisible();

    const geometry = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector('#main-content');
      const journal = document.querySelector('.journal-page');
      const rail = document.querySelector('.journal-sidebar');
      const editor = document.querySelector('.journal-editor-card');
      const mainRect = main?.getBoundingClientRect();
      const journalRect = journal?.getBoundingClientRect();
      const railRect = rail?.getBoundingClientRect();
      const editorRect = editor?.getBoundingClientRect();
      return {
        hasHorizontalOverflow: root.scrollWidth > root.clientWidth,
        mainWidth: mainRect?.width ?? 0,
        journalWidth: journalRect?.width ?? 0,
        railWidth: railRect?.width ?? 0,
        editorWidth: editorRect?.width ?? 0,
      };
    });
    expect(geometry.hasHorizontalOverflow).toBeFalsy();
    expect(Math.abs(geometry.mainWidth - geometry.journalWidth)).toBeLessThanOrEqual(1);
    if (viewport.width >= 1024) {
      expect(geometry.railWidth).toBeLessThanOrEqual(260);
      expect(geometry.editorWidth).toBeGreaterThan(geometry.railWidth);
    }

    await page.screenshot({
      path: testInfo.outputPath(`journal-workspace-${viewport.width}.png`),
      fullPage: true,
    });
  }
});
