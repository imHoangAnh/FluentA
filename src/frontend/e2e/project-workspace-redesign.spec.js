import { expect, test } from '@playwright/test'

const user = {
  id: 'project-redesign-user',
  email: 'project-redesign@fluenta.local',
  fullName: 'Project Learner',
  isEmailVerified: true,
}

const baseColumns = [
  { id: 'todo', name: 'To Do', sortOrder: 0, cards: [] },
  { id: 'progress', name: 'In Progress', sortOrder: 1, cards: [] },
  { id: 'done', name: 'Done', sortOrder: 2, cards: [] },
]

const reviewColumn = { id: 'review', name: 'Review', sortOrder: 3, cards: [] }

function withDates(value) {
  return {
    ...value,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  }
}

test('Project uses the wide route and keeps extra-column overflow inside the board', async ({ page }, testInfo) => {
  let includeReviewColumn = false

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: user }),
      })
      return
    }

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
      return
    }

    if (request.method() === 'GET' && path.endsWith('/project/boards')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [withDates({
            id: 'board-1',
            name: 'FluentA release plan',
            columnCount: includeReviewColumn ? 4 : 3,
            cardCount: 0,
          })],
        }),
      })
      return
    }

    if (request.method() === 'GET' && path.endsWith('/project/boards/board-1')) {
      const columns = includeReviewColumn ? [...baseColumns, reviewColumn] : baseColumns
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: withDates({
            id: 'board-1',
            name: 'FluentA release plan',
            columns: columns.map(withDates),
          }),
        }),
      })
      return
    }

    if (request.method() === 'POST' && path.endsWith('/project/boards/board-1/columns')) {
      includeReviewColumn = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: withDates(reviewColumn) }),
      })
      return
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Deterministic Project redesign fixture' }),
    })
  })

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('http://localhost:5173/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('SecurePass123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('link', { name: 'Project', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'FluentA release plan' })).toBeVisible()
  await expect(page.getByTestId('project-column-To Do')).toBeVisible()
  await expect(page.getByText('No cards yet')).toHaveCount(3)
  await expect(page.getByPlaceholder('Search cards...')).toHaveCount(0)
  await expect(page.getByText('Assignee', { exact: true })).toHaveCount(0)

  const wideLayout = await page.evaluate(() => {
    const main = document.querySelector('#main-content').getBoundingClientRect()
    const workspace = document.querySelector('[data-testid="project-route-workspace"]').getBoundingClientRect()
    const board = document.querySelector('[data-testid="project-board-surface"]')
    const columns = [...document.querySelectorAll('.project-column-modern')].map((element) => element.getBoundingClientRect())
    return {
      viewportWidth: window.innerWidth,
      mainRight: main.right,
      workspaceRight: workspace.right,
      boardClientWidth: board.clientWidth,
      boardScrollWidth: board.scrollWidth,
      columnWidths: columns.map((column) => column.width),
      firstColumnLeft: columns[0].left,
      lastColumnRight: columns.at(-1).right,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }
  })

  expect(wideLayout.viewportWidth - wideLayout.mainRight).toBeLessThanOrEqual(1)
  expect(wideLayout.viewportWidth - wideLayout.workspaceRight).toBeLessThanOrEqual(20)
  expect(wideLayout.documentScrollWidth).toBeLessThanOrEqual(wideLayout.documentClientWidth)
  expect(wideLayout.boardScrollWidth).toBeLessThanOrEqual(wideLayout.boardClientWidth + 1)
  expect(Math.min(...wideLayout.columnWidths)).toBeGreaterThan(380)
  expect(wideLayout.lastColumnRight - wideLayout.firstColumnLeft).toBeGreaterThan(wideLayout.boardClientWidth * 0.9)

  await page.screenshot({ path: testInfo.outputPath('project-wide-three-columns.png') })

  await page.getByRole('button', { name: 'Add column' }).click()
  await page.getByTestId('project-column-name-input').fill('Review')
  await page.getByRole('button', { name: 'Create column' }).click()
  await expect(page.getByTestId('project-column-Review')).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 900 })
  const overflowLayout = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="project-board-surface"]')
    return {
      boardClientWidth: board.clientWidth,
      boardScrollWidth: board.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }
  })

  expect(overflowLayout.boardScrollWidth).toBeGreaterThan(overflowLayout.boardClientWidth)
  expect(overflowLayout.documentScrollWidth).toBeLessThanOrEqual(overflowLayout.documentClientWidth)

  await page.getByTestId('project-column-To Do').getByRole('button', { name: 'Add Card' }).click()
  await expect(page.getByRole('complementary', { name: 'Create card' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  )

  await page.screenshot({ path: testInfo.outputPath('project-tablet-local-overflow.png') })
})
