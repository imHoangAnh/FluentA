import { expect, test } from '@playwright/test'

const user = { id: 'review-user', email: 'review@fluenta.local', fullName: 'Review Learner', isEmailVerified: true }
const session = { sessionId: 'review-session', boardId: 'board-1', boardName: 'Review board', orderType: 'sequential', mode: 'random', startedAt: '2026-07-14T00:00:00Z', totalWords: 2, words: [
  { wordId: 'word-1', word: 'alpha', wordClass: 'other', ipaPronunciation: '/ˈælfə/', meaningVn: 'alpha vn', meaningEn: 'alpha definition', example: 'alpha example', mode: 'meaningToWord' },
  { wordId: 'word-2', word: 'beta', wordClass: 'other', ipaPronunciation: '/ˈbiːtə/', meaningVn: 'beta vn', meaningEn: 'beta definition', example: 'beta example', mode: 'meaningToWord' },
] }

async function mockReviewApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/flashcards/pages')) return json([{ boardId: 'board-1', boardName: 'Review board', boardLanguage: 'en', pages: [{ pageId: 'page-1', pageName: 'Deck', isPracticed: false, words: [{ id: 'card-1', wordId: 'word-1', word: 'alpha', wordClass: 'other', ipaPronunciation: '/ˈælfə/', meaningVn: 'alpha vn', meaningEn: 'alpha definition', example: 'alpha example', isInReview: true, nextReviewDate: '2026-07-13', lapseCount: 0 }, { id: 'card-2', wordId: 'word-2', word: 'beta', wordClass: 'other', ipaPronunciation: '/ˈbiːtə/', meaningVn: 'beta vn', meaningEn: 'beta definition', example: 'beta example', isInReview: true, nextReviewDate: '2026-07-12', lapseCount: 0 }] }] }])
    if (path.endsWith('/review/sessions')) return json(session)
    if (path.endsWith('/review')) return json({ wordId: 'word-1', result: 'correct', reviewHistoryId: 'history-1', levelBefore: 0, levelAfter: 1, lapseCount: 0, nextReviewDate: '2026-07-15' })
    return json({ message: 'Unexpected Review request' }, 503)
  })
}

test('review workflow keeps the board-scoped queue and completion flow', async ({ page }) => {
  await mockReviewApis(page)
  await page.goto('/review')
  await expect(page.getByTestId('review-setup-state')).toHaveText('Select a board to start review')
  await expect(page.locator('.review-setup-badge')).toHaveCount(0)
  await expect(page.locator('.review-setup-header')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight)).toBe(true)
  const setupHeight = await page.locator('.review-setup-card').evaluate((element) => Math.round(element.getBoundingClientRect().height))
  const mainHeight = await page.locator('#main-content').evaluate((element) => Math.round(element.getBoundingClientRect().height))
  expect(setupHeight).toBeLessThan(mainHeight - 40)
  expect(setupHeight).toBeGreaterThan(480)
  await page.getByLabel('Vocabulary board').click()
  await page.getByRole('option', { name: 'Review board (2 due)', exact: true }).click()
  await expect(page.getByTestId('review-setup-state')).toHaveCount(0)
  await page.getByRole('button', { name: /Sequential/ }).click()
  await page.getByRole('checkbox', { name: 'Show recap after each answer' }).uncheck()
  await page.getByRole('button', { name: 'Start review' }).click()
  await expect(page.getByText('Sequential')).toBeVisible()
  await expect(page.getByText('1 / 2')).toBeVisible()
  await expect(page.getByTestId('active-review-card')).toHaveClass(/review-card--meaningToWord/)
  await expect(page.getByText('What word matches this meaning?')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight)).toBe(true)
  await page.getByLabel('Type the word').fill('alpha')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Correct')
  await expect(page.getByText('What word matches this meaning?')).toHaveCount(0)
  await page.waitForTimeout(1_000)
  await expect(page.getByRole('status')).toHaveText('Correct')
  await expect(page.getByText('2 / 2')).toBeVisible()
})
