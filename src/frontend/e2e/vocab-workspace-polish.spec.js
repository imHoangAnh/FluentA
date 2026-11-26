import { expect, test } from '@playwright/test'

const user = {
  id: 'workspace-polish-user',
  email: 'workspace@fluenta.local',
  fullName: 'Workspace Learner',
  isEmailVerified: true,
}

const board = {
  id: 'board-1',
  name: 'TOEIC Vocabulary',
  language: 'en',
  pageCount: 30,
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
}

const page = {
  id: 'page-1',
  boardId: board.id,
  name: 'Long content page',
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
}

const pages = [
  page,
  ...Array.from({ length: 29 }, (_, index) => ({
    id: `page-${index + 2}`,
    boardId: board.id,
    name: `Archived page ${index + 2}`,
    createdAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
  })),
]

const preferences = {
  hiddenColumns: [],
  columnOrder: ['word', 'meaning', 'ipaPronunciation', 'context', 'type', 'example', 'synonyms', 'antonyms'],
  columnWidths: {
    word: 220,
    meaning: 260,
    ipaPronunciation: 200,
    context: 360,
    type: 160,
    example: 380,
    synonyms: 280,
    antonyms: 280,
  },
  updatedAt: null,
}

const words = Array.from({ length: 30 }, (_, index) => ({
  id: `word-${index + 1}`,
  pageId: page.id,
  word: `vocabulary-${index + 1}`,
  meaning: `Nghĩa tiếng Việt ${index + 1}`,
  ipaPronunciation: '/vəˈkæbjəˌleri/',
  context: 'A deliberately long usage context that wraps across multiple lines without scrolling inside the vocabulary cell. '.repeat(4),
  type: 'noun',
  example: 'This example remains readable while the surrounding list scrolls. '.repeat(5),
  synonyms: 'term, expression',
  antonyms: 'silence',
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
}))

async function mockWorkspaceApis(pageInstance) {
  await pageInstance.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data = []

    if (path.endsWith('/auth/me')) data = user
    else if (path.endsWith('/vocabs/boards')) data = [board]
    else if (path.endsWith(`/vocabs/boards/${board.id}`)) data = { ...board, pages, preferences }
    else if (path.endsWith(`/vocabs/pages/${page.id}/words`)) data = words

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })
  })
}

test('keeps the compact AppShell and dense vocabulary workspace stable at desktop and tablet widths', async ({ page: browserPage }, testInfo) => {
  await mockWorkspaceApis(browserPage)

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 900 },
  ]) {
    await browserPage.setViewportSize({ width: viewport.width, height: viewport.height })
    await browserPage.goto('/vocabulary')

    await expect(browserPage.getByRole('heading', { name: 'Long content page' })).toBeVisible()
    await expect(browserPage.getByRole('textbox', { name: 'Filter boards' })).toBeVisible()
    await expect(browserPage.getByRole('textbox', { name: 'Filter pages' })).toBeVisible()
    await expect(browserPage.getByRole('textbox', { name: 'Search vocabulary' })).toBeVisible()

    const shell = await browserPage.evaluate(() => {
      const sidebar = document.querySelector('aside[aria-label="Primary navigation"]')
      const pageTabs = document.querySelector('[data-testid="vocabulary-page-scroll"]')
      const table = document.querySelector('[data-testid="vocab-table-scroll"]')
      return {
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        sidebarWidth: Math.round(sidebar.getBoundingClientRect().width),
        headerCount: document.querySelectorAll('header').length,
        pageTabsOwnHorizontalOverflow: pageTabs.scrollWidth > pageTabs.clientWidth,
        tableOwnsVerticalOverflow: table.scrollHeight > table.clientHeight,
        tableOwnsHorizontalOverflow: table.scrollWidth > table.clientWidth,
      }
    })

    expect(shell.documentScrollHeight).toBe(shell.viewportHeight)
    expect(shell.sidebarWidth).toBe(Math.round(viewport.width / 9))
    expect(shell.headerCount).toBe(0)
    expect(shell.pageTabsOwnHorizontalOverflow).toBe(true)
    expect(shell.tableOwnsVerticalOverflow).toBe(true)
    expect(shell.tableOwnsHorizontalOverflow).toBe(true)

    await browserPage.screenshot({ path: testInfo.outputPath(`vocabulary-workspace-${viewport.name}.png`) })

    const table = browserPage.getByTestId('vocab-table-scroll')
    const stickyHeader = browserPage.getByLabel('Resize Word').locator('..')
    const before = await stickyHeader.boundingBox()
    await table.evaluate((element) => { element.scrollTop = 500 })
    const after = await stickyHeader.boundingBox()
    expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1)

    const wordActions = browserPage.getByTestId('sticky-word-actions').first()
    const wordBefore = await wordActions.boundingBox()
    await table.evaluate((element) => { element.scrollLeft = element.scrollWidth })
    const wordAfter = await wordActions.boundingBox()
    expect(Math.abs(wordBefore.x - wordAfter.x)).toBeLessThanOrEqual(1)

    await table.evaluate((element) => { element.scrollTop = 0; element.scrollLeft = 0 })
    await browserPage.getByRole('button', { name: 'Click to add a new vocabulary row...' }).click()
    const createActions = browserPage.getByTestId('sticky-create-actions')
    const createBefore = await createActions.boundingBox()
    await table.evaluate((element) => { element.scrollLeft = element.scrollWidth })
    const createAfter = await createActions.boundingBox()
    expect(Math.abs(createBefore.x - createAfter.x)).toBeLessThanOrEqual(1)
    await browserPage.getByRole('button', { name: 'Cancel adding word' }).click()

    await browserPage.getByRole('button', { name: 'Edit vocabulary-1', exact: true }).click()
    const longCell = browserPage.getByRole('textbox', { name: 'Context for word', exact: true })
    const cellMetrics = await longCell.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(cellMetrics.clientHeight).toBe(cellMetrics.scrollHeight)
    expect(cellMetrics.overflowY).toBe('hidden')

    await expect(browserPage.getByRole('button', { name: /(?:Collapse|Expand) sidebar/ })).toHaveCount(0)

  }
})

test('confirms the exact Board on right-click, cancels safely, then deletes and announces success', async ({ page: browserPage }) => {
  const newest = { ...board, id: 'board-new', name: 'Newest board', pageCount: 1, createdAt: '2026-07-13T00:00:00Z' }
  const older = { ...board, id: 'board-old', name: 'Older board', pageCount: 1, createdAt: '2026-07-12T00:00:00Z' }
  const details = new Map([
    [newest.id, { ...newest, pages: [{ ...page, id: 'page-new', boardId: newest.id, name: 'Newest page', createdAt: newest.createdAt }], preferences }],
    [older.id, { ...older, pages: [{ ...page, id: 'page-old', boardId: older.id, name: 'Older page', createdAt: older.createdAt }], preferences }],
  ])
  const deletedBoards = []

  await browserPage.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
    if (method === 'GET' && path.endsWith('/boards')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [...details.values()].map(({ pages: _pages, preferences: _preferences, ...summary }) => summary) }) })
    if (method === 'DELETE' && path.includes('/boards/')) {
      const boardId = path.split('/').at(-1)
      deletedBoards.push(boardId)
      details.delete(boardId)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { deleted: true } }) })
    }
    const boardId = path.split('/').at(-1)
    if (method === 'GET' && details.has(boardId)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: details.get(boardId) }) })
    if (path.endsWith('/words')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ data: null }) })
  })

  await browserPage.goto('/vocabulary')
  const boardTab = browserPage.getByRole('tab', { name: 'Newest board' })
  await expect(boardTab).toBeVisible()
  await boardTab.click({ button: 'right' })
  await browserPage.getByRole('menuitem', { name: 'Delete Board' }).click()
  await expect(browserPage.getByRole('alertdialog', { name: 'Confirm deletion' })).toContainText('Delete "Newest board"?')
  expect(deletedBoards).toEqual([])
  await browserPage.getByRole('alertdialog', { name: 'Confirm deletion' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(boardTab).toBeVisible()
  expect(deletedBoards).toEqual([])

  await boardTab.click({ button: 'right' })
  await browserPage.getByRole('menuitem', { name: 'Delete Board' }).click()
  await browserPage.getByRole('alertdialog', { name: 'Confirm deletion' }).getByRole('button', { name: 'Delete' }).click()
  await expect.poll(() => deletedBoards).toEqual(['board-new'])
  await expect(browserPage.getByRole('heading', { name: 'Older page' })).toBeVisible()
})
