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
  columnOrder: ['word', 'meaningVn', 'ipaPronunciation', 'definition', 'class', 'example', 'note', 'synonyms', 'antonyms'],
  columnWidths: {
    word: 220,
    meaningVn: 260,
    ipaPronunciation: 200,
    definition: 360,
    class: 160,
    example: 380,
    note: 300,
    synonyms: 280,
    antonyms: 280,
  },
  updatedAt: null,
}

const words = Array.from({ length: 30 }, (_, index) => ({
  id: `word-${index + 1}`,
  pageId: page.id,
  word: `vocabulary-${index + 1}`,
  meaningVn: `Nghĩa tiếng Việt ${index + 1}`,
  ipaPronunciation: '/vəˈkæbjəˌleri/',
  definition: 'A deliberately long definition that wraps across multiple lines without scrolling inside the vocabulary cell. '.repeat(4),
  class: 'noun',
  example: 'This example remains readable while the surrounding list scrolls. '.repeat(5),
  note: '',
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
    else if (path.endsWith('/boards')) data = [board]
    else if (path.endsWith(`/boards/${board.id}`)) data = { ...board, pages, preferences }
    else if (path.includes(`/boards/${board.id}/pages/`) && path.endsWith('/words')) data = words

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })
  })
}

test('keeps the compact AppShell and dense vocabulary workspace stable at desktop and tablet widths', async ({ page: browserPage }, testInfo) => {
  await mockWorkspaceApis(browserPage)

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000, sidebarWidth: 184 },
    { name: 'tablet', width: 1024, height: 900, sidebarWidth: 84 },
  ]) {
    await browserPage.setViewportSize({ width: viewport.width, height: viewport.height })
    await browserPage.goto('/vocabulary')

    await expect(browserPage.getByRole('heading', { name: 'Long content page' })).toBeVisible()
    await expect(browserPage.getByRole('button', { name: 'Search' })).toBeDisabled()
    await expect(browserPage.getByRole('button', { name: 'Filter' })).toBeDisabled()
    await expect(browserPage.getByText('Coming soon')).toBeAttached()
    await expect(browserPage.getByRole('button', { name: 'Setting Columns' })).toBeVisible()

    const shell = await browserPage.evaluate(() => {
      const sidebar = document.querySelector('aside[aria-label="Primary navigation"]')
      const rail = document.querySelector('[data-testid="vocabulary-rail-scroll"]')
      const table = document.querySelector('[data-testid="vocab-table-scroll"]')
      return {
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        sidebarWidth: Math.round(sidebar.getBoundingClientRect().width),
        headerCount: document.querySelectorAll('header').length,
        railOwnsVerticalOverflow: rail.scrollHeight > rail.clientHeight,
        tableOwnsVerticalOverflow: table.scrollHeight > table.clientHeight,
        tableOwnsHorizontalOverflow: table.scrollWidth > table.clientWidth,
      }
    })

    expect(shell.documentScrollHeight).toBe(shell.viewportHeight)
    expect(shell.sidebarWidth).toBe(viewport.sidebarWidth)
    expect(shell.headerCount).toBe(0)
    expect(shell.railOwnsVerticalOverflow).toBe(true)
    expect(shell.tableOwnsVerticalOverflow).toBe(true)
    expect(shell.tableOwnsHorizontalOverflow).toBe(true)

    await browserPage.screenshot({ path: testInfo.outputPath(`vocabulary-workspace-${viewport.name}.png`) })

    const table = browserPage.getByTestId('vocab-table-scroll')
    const stickyHeader = browserPage.getByLabel('Resize Word').locator('..')
    const before = await stickyHeader.boundingBox()
    await table.evaluate((element) => { element.scrollTop = 500 })
    const after = await stickyHeader.boundingBox()
    expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1)

    const deleteActions = browserPage.getByTestId('sticky-word-actions').first()
    const createActions = browserPage.getByTestId('sticky-create-actions')
    const deleteBefore = await deleteActions.boundingBox()
    const createBefore = await createActions.boundingBox()
    await table.evaluate((element) => { element.scrollLeft = element.scrollWidth })
    const deleteAfter = await deleteActions.boundingBox()
    const createAfter = await createActions.boundingBox()
    expect(Math.abs(deleteBefore.x - deleteAfter.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(createBefore.x - createAfter.x)).toBeLessThanOrEqual(1)

    const longCell = browserPage.getByRole('textbox', { name: 'Definition for vocabulary-1', exact: true })
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
      return route.fulfill({ status: 204 })
    }
    const boardId = path.split('/').at(-1)
    if (method === 'GET' && details.has(boardId)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: details.get(boardId) }) })
    if (path.endsWith('/words')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ data: null }) })
  })

  await browserPage.goto('/vocabulary')
  const boardButton = browserPage.getByRole('button', { name: /Newest board/ })
  await expect(boardButton).toBeVisible()
  await boardButton.click({ button: 'right' })
  await browserPage.getByRole('menuitem', { name: 'Delete Board' }).click()
  await expect.poll(() => deletedBoards).toEqual(['board-new'])
  await expect(browserPage.getByRole('heading', { name: 'Older page' })).toBeVisible()
})
