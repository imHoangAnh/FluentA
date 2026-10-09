import { expect, test } from '@playwright/test'

const first = {
  id: 'figma-entry-1', title: 'A slower kind of morning', date: '2026-09-29',
  content: '<p>I left my phone on the kitchen counter and took my coffee outside. For once, there was nothing to catch up on. Just the cool air, the sound of the street waking up, and a few quiet minutes.</p><p>It reminded me that a good day does not have to be a big day. Sometimes it is simply noticing what is already here.</p>',
  createdAt: '2026-09-29T08:00:00Z', updatedAt: '2026-09-29T08:00:00Z',
}

async function mockJournal(page, initialEntries) {
  let entries = initialEntries.map(entry => ({ ...entry }))
  const writes = []
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    let data = []
    if (path === '/auth/me') data = { id: 'figma-user', fullName: 'Journal Preview', avatarUrl: null }
    else if (path === '/journal/calendar') data = entries.filter(entry => entry.date.startsWith(url.searchParams.get('month'))).map(entry => ({ date: entry.date, count: 1 }))
    else if (path === '/journal/search') data = entries.filter(entry => entry.title.toLowerCase().includes(url.searchParams.get('q').toLowerCase())).map(entry => ({ ...entry, highlights: [] }))
    else if (request.method() === 'POST' || request.method() === 'PATCH') {
      const patch = request.postDataJSON()
      writes.push(patch)
      const id = request.method() === 'POST' ? 'new-figma-entry' : path.split('/').at(-1)
      data = { ...(entries.find(entry => entry.id === id) ?? first), ...patch, id }
      entries = [...entries.filter(entry => entry.id !== id), data]
    } else if (path === '/journal') data = entries
    else if (path.startsWith('/journal/')) data = entries.find(entry => entry.id === path.split('/').at(-1))
    await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: { success: true, data, errors: [] } })
  })
  return writes
}

test('Figma first-entry screen starts a journal and auto-saves the new entry', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  const writes = await mockJournal(page, [])
  await page.goto('/journal')
  await expect(page.getByRole('heading', { name: 'Your story starts here' })).toBeVisible()
  await expect(page.getByPlaceholder('How do you feel today?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start wherever you are…' })).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Journal formatting tools' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: testInfo.outputPath('journal-first-entry.png'), fullPage: true })
  await page.getByRole('button', { name: 'Start wherever you are…' }).click()
  await page.getByLabel('Journal title', { exact: true }).fill('A small moment today')
  await page.getByRole('textbox', { name: 'Journal rich text editor' }).fill('A few words about today.')
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved')
  expect(writes.at(-1)).toMatchObject({ title: 'A small moment today', content: '<p>A few words about today.</p>' })
  await expect(page.getByRole('button', { name: 'Open journal A small moment today' })).toBeVisible()
})

test('large Journal lists retain offscreen entries and allow opening them after scrolling', async ({ page }) => {
  const entries = Array.from({ length: 400 }, (_, index) => ({
    ...first, id: `large-entry-${index}`, title: `History entry ${index}`,
    date: new Date(Date.UTC(2026, 8, 29 - index)).toISOString().slice(0, 10),
  }))
  await mockJournal(page, entries)
  await page.goto('/journal')
  await expect(page.locator('.journal-entry-list > button')).toHaveCount(400)
  const last = page.getByRole('button', { name: 'Open journal History entry 399', exact: true })
  expect(await last.evaluate(element => getComputedStyle(element).contentVisibility)).toBe('auto')
  await last.scrollIntoViewIfNeeded()
  await expect(last).toBeVisible()
  await last.click()
  await expect(page.getByLabel('Journal title', { exact: true })).toHaveValue('History entry 399')
  await page.getByTestId('journal-search-input').fill('History entry 0')
  await expect(page.getByRole('button', { name: 'Open journal History entry 0', exact: true })).toBeVisible()
})

test('Figma writing screen keeps toolbar, calendar, search, drafts and responsive geometry working', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  const writes = await mockJournal(page, [first,
    { ...first, id: 'figma-entry-2', title: 'Small steps, real progress', date: '2026-09-28' },
    { ...first, id: 'figma-entry-3', title: 'An afternoon outside', date: '2026-09-27' },
    { ...first, id: 'figma-entry-4', title: 'Something worth keeping', date: '2026-09-25' },
  ])
  await page.goto('/journal')
  await page.getByRole('button', { name: `Open journal ${first.title}` }).click()
  const editor = page.getByRole('textbox', { name: 'Journal rich text editor' })
  await expect(editor).toContainText('I left my phone')
  await page.evaluate(() => document.fonts.ready)
  for (const viewport of [{ width: 1440, height: 960 }, { width: 1024, height: 800 }, { width: 768, height: 900 }, { width: 320, height: 800 }]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('toolbar', { name: 'Journal formatting tools' })).toBeVisible()
    await expect(editor).toBeVisible()
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      verticalOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      railWidth: document.querySelector('.journal-sidebar').getBoundingClientRect().width,
      font: getComputedStyle(document.querySelector('.journal-title-input')).fontFamily,
      editorFont: getComputedStyle(document.querySelector('.journal-rich-text-content')).fontFamily,
      background: getComputedStyle(document.querySelector('.journal-page')).backgroundColor,
    }))
    expect(geometry.overflow).toBe(false)
    expect(geometry.verticalOverflow).toBe(false)
    expect(geometry.font).toContain('Lora Variable')
    expect(geometry.editorFont).toContain('Lora Variable')
    expect(geometry.background).toBe('rgb(246, 245, 241)')
    if (viewport.width === 1440) expect(geometry.railWidth).toBe(288)
    await page.screenshot({ path: testInfo.outputPath(`journal-writing-${viewport.width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.getByLabel('Choose journal date', { exact: true }).click()
  await expect(page.getByLabel('Journal date calendar', { exact: true })).toBeVisible()
  await page.getByTestId('journal-calendar-day-2026-09-28').click()
  await expect(page.getByLabel('Journal title', { exact: true })).toHaveValue('Small steps, real progress')
  await page.getByTestId('journal-search-input').fill('outside')
  await expect(page.getByRole('button', { name: 'Open journal An afternoon outside' })).toBeVisible()
  await expect(page.getByRole('button', { name: `Open journal ${first.title}` })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear journal search' }).click()
  await page.getByRole('button', { name: `Open journal ${first.title}` }).click()
  await editor.click()
  await page.getByRole('combobox', { name: 'Text style' }).selectOption('2')
  await expect(editor.locator('h2')).toContainText('I left my phone')
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved')
  expect(writes.at(-1).content).toContain('<h2>')
  await page.getByRole('combobox', { name: 'Text style' }).selectOption('paragraph')
  await expect(editor.locator('h2')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bullet list', exact: true }).click()
  await expect(editor.locator('ul > li')).not.toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(editor.locator('ul')).toHaveCount(0)
  await page.getByLabel('Journal title', { exact: true }).fill('Current unsaved draft')
  await page.getByRole('button', { name: 'Drafts', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open current draft Current unsaved draft' })).toBeVisible()
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved')
  await expect(page.getByRole('heading', { name: 'No unsaved drafts' })).toBeVisible()
  await page.getByRole('button', { name: 'All entries', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open journal Current unsaved draft' })).toBeVisible()
})
