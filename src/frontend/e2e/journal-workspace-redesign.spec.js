import { expect, test } from '@playwright/test';
import { loginSeededUser } from './support/auth-fixture.js';

async function registerAndLogin(page) {
  const identity = await loginSeededUser(page, { prefix: 'journal-workspace-redesign' });
  return identity;
}

test('Journal uses the approved full-width hierarchy without responsive overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { token } = await registerAndLogin(page);
  const title = `Workspace proof ${crypto.randomUUID().slice(0, 8)}`;
  const createResponse = await page.request.post('https://localhost:7000/api/v1/journal', {
    data: {
      title,
      date: '2026-07-22',
      content: '<p>Responsive Journal workspace proof.</p>',
    },
    headers: { Cookie: `access_token=${token}` },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL('/journal');
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
  const dateDisplay = editorHeader.getByTestId('journal-date-display');
  const actions = editorHeader.getByTestId('journal-editor-actions');
  const saveButton = actions.getByTestId('save-journal-button');
  const deleteButton = actions.getByRole('button', { name: `Delete journal ${title}` });
  const editorBody = page.getByTestId('journal-editor-body');
  const toolbar = editorHeader.getByTestId('journal-toolbar-host').getByRole('toolbar', { name: 'Journal formatting tools' });
  const writingSurface = editorBody.getByLabel('Journal rich text editor');

  await expect(titleInput).toHaveValue(title);
  await expect(dateDisplay).toHaveAttribute('data-date', '2026-07-22');
  await expect(editorHeader.getByLabel('Journal date')).toHaveCount(0);
  await expect(actions.getByTestId('journal-save-status')).toHaveText('Saved');
  await expect(toolbar).toBeVisible();
  await expect(writingSurface).toBeVisible();
  await expect(page.locator('.journal-editor-footer')).toHaveCount(0);

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
      const entryList = document.querySelector('.journal-entry-list');
      const editorBody = document.querySelector('.journal-editor-body');
      const mainRect = main?.getBoundingClientRect();
      const journalRect = journal?.getBoundingClientRect();
      const railRect = rail?.getBoundingClientRect();
      const editorRect = editor?.getBoundingClientRect();
      const entryListStyle = entryList ? getComputedStyle(entryList) : null;
      const editorBodyStyle = editorBody ? getComputedStyle(editorBody) : null;
      return {
        hasHorizontalOverflow: root.scrollWidth > root.clientWidth,
        hasVerticalOverflow: root.scrollHeight > root.clientHeight,
        mainWidth: mainRect?.width ?? 0,
        journalWidth: journalRect?.width ?? 0,
        railWidth: railRect?.width ?? 0,
        editorWidth: editorRect?.width ?? 0,
        entryListOverflowY: entryListStyle?.overflowY ?? '',
        editorBodyOverflowY: editorBodyStyle?.overflowY ?? '',
      };
    });
    expect(geometry.hasHorizontalOverflow).toBeFalsy();
    expect(geometry.hasVerticalOverflow).toBeFalsy();
    expect(Math.abs(geometry.mainWidth - geometry.journalWidth)).toBeLessThanOrEqual(40);
    if (viewport.width >= 1024) {
      expect(geometry.editorWidth / geometry.railWidth).toBeGreaterThan(4.8);
      expect(geometry.editorWidth / geometry.railWidth).toBeLessThan(5.2);
    }
    expect(geometry.entryListOverflowY).toBe('auto');
    expect(geometry.editorBodyOverflowY).toBe('auto');

    await page.screenshot({
      path: testInfo.outputPath(`journal-workspace-${viewport.width}.png`),
      fullPage: true,
    });
  }
});
