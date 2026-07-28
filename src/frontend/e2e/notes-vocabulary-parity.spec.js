import { expect, test } from '@playwright/test'

const user = {
  id: 'note-parity-user',
  email: 'notes@fluenta.local',
  fullName: 'Notes Learner',
  isEmailVerified: true,
}

function json(data) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ data }) }
}

async function mockNoteApis(page) {
  const longPageName = 'A very long Notes page title that must stay inside the page rail and end with an ellipsis'
  const board = {
    id: 'board-1',
    name: 'Learning Notes',
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-07-21T09:00:00Z',
    pages: [
      {
        id: 'page-1',
        boardId: 'board-1',
        name: 'Vocabulary recap',
        date: '2026-07-21',
        createdAt: '2026-07-21T09:00:00Z',
        updatedAt: '2026-07-21T09:00:00Z',
      },
      {
        id: 'page-long',
        boardId: 'board-1',
        name: longPageName,
        date: '2026-07-20',
        createdAt: '2026-07-20T09:00:00Z',
        updatedAt: '2026-07-20T09:00:00Z',
      },
    ],
  }
  const pageDetails = new Map([[
    'page-1',
    {
      ...board.pages[0],
      content: '<p>Review today’s vocabulary.</p>',
    },
  ]])

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()

    if (path.endsWith('/auth/refresh')) return route.fulfill(json({ accessToken: 'note-parity-token', user }))
    if (path.endsWith('/auth/me')) return route.fulfill(json(user))
    if (path.endsWith('/notes/boards') && method === 'GET') return route.fulfill(json([board]))

    const createPageMatch = path.match(/\/notes\/boards\/([^/]+)\/pages$/)
    if (createPageMatch && method === 'POST') {
      const input = request.postDataJSON()
      const createdPage = {
        id: 'page-created',
        boardId: createPageMatch[1],
        name: input.name,
        content: '',
        date: '2026-07-22',
        createdAt: '2026-07-22T09:00:00Z',
        updatedAt: '2026-07-22T09:00:00Z',
      }
      pageDetails.set(createdPage.id, createdPage)
      board.pages = [{ ...createdPage, content: undefined }, ...board.pages]
      return route.fulfill(json(createdPage))
    }

    const pageMatch = path.match(/\/notes\/pages\/([^/]+)$/)
    if (pageMatch && method === 'GET') return route.fulfill(json(pageDetails.get(pageMatch[1])))
    if (pageMatch && method === 'PATCH') {
      const current = pageDetails.get(pageMatch[1])
      const updated = { ...current, ...request.postDataJSON(), updatedAt: '2026-07-22T10:00:00Z' }
      pageDetails.set(pageMatch[1], updated)
      board.pages = board.pages.map((item) => item.id === updated.id
        ? {
            id: updated.id,
            boardId: updated.boardId,
            name: updated.name,
            date: updated.date,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          }
        : item)
      return route.fulfill(json(updated))
    }
    if (pageMatch && method === 'DELETE') {
      pageDetails.delete(pageMatch[1])
      board.pages = board.pages.filter((item) => item.id !== pageMatch[1])
      return route.fulfill(json(null))
    }

    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unmocked Notes proof route: ${method} ${path}` }),
    })
  })
}

test('Notes page titles use an ellipsis instead of overflowing the rail', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await mockNoteApis(page)
  await page.goto('http://localhost:5173/notes')

  const longPageName = 'A very long Notes page title that must stay inside the page rail and end with an ellipsis'
  const pageButton = page.getByRole('button', { name: longPageName })
  const label = pageButton.getByText(longPageName)
  const metrics = await label.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflow: style.overflow,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
    }
  })

  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)
  expect(metrics).toMatchObject({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
})

for (const viewport of [
  { name: 'mobile', width: 320, height: 780 },
  { name: 'tablet-narrow', width: 768, height: 900 },
  { name: 'tablet-wide', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`Notes vocabulary parity at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockNoteApis(page)

    await page.goto('http://localhost:5173/notes')
    await expect(page.getByLabel('Note title')).toHaveValue('Vocabulary recap')

    const header = page.getByTestId('note-editor-header')
    const toolbarHost = page.getByTestId('note-toolbar-host')
    const toolbar = page.getByRole('toolbar', { name: 'Note formatting tools' })
    const editor = page.getByLabel('Journal rich text editor')

    await expect(toolbar).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Heading 1' })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Redo' })).toBeInViewport()
    expect(await header.evaluate((element) => element.contains(document.querySelector('[aria-label="Note formatting tools"]')))).toBe(true)
    expect(await toolbarHost.evaluate((element) => element.contains(document.querySelector('[aria-label="Note formatting tools"]')))).toBe(true)

    const idleCanvasStyle = await editor.evaluate((element) => {
      const style = getComputedStyle(element)
      return { border: style.borderWidth, outline: style.outlineStyle }
    })
    expect(idleCanvasStyle).toEqual({ border: '0px', outline: 'none' })
    await editor.click()
    const focusedCanvasStyle = await editor.evaluate((element) => {
      const style = getComputedStyle(element)
      return { border: style.borderWidth, outline: style.outlineStyle }
    })
    expect(focusedCanvasStyle).toEqual({ border: '0px', outline: 'none' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`notes-${viewport.name}.png`), fullPage: true })

    const createBoardTrigger = page.getByRole('button', { name: 'Create new board' })
    await createBoardTrigger.click()
    await expect(page.getByRole('dialog')).toContainText('Create board')
    await expect(page.getByLabel('Board name')).toBeFocused()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(createBoardTrigger).toBeFocused()

    await page.getByRole('button', { name: 'Add page' }).click()
    await expect(page.getByRole('dialog')).toContainText('Add a note page to “Learning Notes”.')
    await page.getByLabel('Page name').fill('Browser proof page')
    await page.getByRole('button', { name: 'Create page' }).click()
    await expect(page.getByLabel('Note title')).toHaveValue('Browser proof page')

    const createdPage = page.getByRole('button', { name: 'Browser proof page' })
    await createdPage.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Rename Page' }).click()
    await page.getByLabel('Page name').fill('Renamed browser page')
    await page.getByRole('button', { name: 'Rename' }).click()
    const renamedPage = page.getByRole('button', { name: 'Renamed browser page' })
    await expect(renamedPage).toBeVisible()

    await renamedPage.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete Page' }).click()
    await expect(page.getByRole('alertdialog')).toContainText('Delete “Renamed browser page”?')
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByTestId('notes-rail-scroll')).toBeFocused()
    await expect(page.getByLabel('Note title')).toHaveValue('Vocabulary recap')

    const boardTrigger = page.getByRole('button', { name: /Learning Notes/ })
    await boardTrigger.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete Board' }).click()
    await expect(page.getByRole('alertdialog')).toContainText('Delete “Learning Notes”?')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(boardTrigger).toBeFocused()

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
