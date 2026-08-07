import { expect, test } from '@playwright/test'

const user = { id: 'review-user', email: 'review@fluenta.local', fullName: 'Review Learner', isEmailVerified: true }
const session = { sessionId: 'review-session', boardId: 'board-1', boardName: 'Review board', orderType: 'sequential', mode: 'random', startDisposition: 'started', startedAt: '2026-07-14T00:00:00Z', totalWords: 2, startOptions: { hasActiveSameDaySession: false, remainingWords: 2, requiresDecision: false }, words: [
  { wordId: 'word-1', word: 'alpha', wordClass: 'other', ipaPronunciation: '/ˈælfə/', meaningVn: 'alpha vn', meaningEn: 'alpha definition', example: 'alpha example', mode: 'meaningToWord' },
  { wordId: 'word-2', word: 'beta', wordClass: 'other', ipaPronunciation: '/ˈbiːtə/', meaningVn: 'beta vn', meaningEn: 'beta definition', example: 'beta example', mode: 'meaningToWord' },
] }

async function mockReviewApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/flashcards/pages')) return json([{ boardId: 'board-1', boardName: 'Review board', boardLanguage: 'en', pages: [{ pageId: 'page-1', pageName: 'Deck', isPracticed: false, words: [{ id: 'card-1', wordId: 'word-1', word: 'alpha', wordClass: 'other', ipaPronunciation: '/ˈælfə/', meaningVn: 'alpha vn', meaningEn: 'alpha definition', example: 'alpha example', isInReview: true, nextReviewDate: '2026-07-13', lapseCount: 0 }, { id: 'card-2', wordId: 'word-2', word: 'beta', wordClass: 'other', ipaPronunciation: '/ˈbiːtə/', meaningVn: 'beta vn', meaningEn: 'beta definition', example: 'beta example', isInReview: true, nextReviewDate: '2026-07-12', lapseCount: 0 }] }] }])
    if (path.endsWith('/review/settings')) return json({ dailyLimit: 2, recapAfterAnswer: false })
    if (path.endsWith('/review/sessions')) return json(session)
    if (path.endsWith('/review')) return json({ wordId: 'word-1', result: 'correct', reviewHistoryId: 'history-1', levelBefore: 0, levelAfter: 1, lapseCount: 0, nextReviewDate: '2026-07-15' })
    return json({ message: 'Unexpected Review request' }, 503)
  })
}

test('review workflow keeps the board-scoped queue and completion flow', async ({ page }) => {
  await mockReviewApis(page)
  await page.goto('/review')
  await page.getByLabel('Vocabulary board').click()
  await page.getByRole('option', { name: 'Review board (2 due)', exact: true }).click()
  await page.getByRole('button', { name: /Sequential/ }).click()
  await page.getByRole('button', { name: 'Start review' }).click()
  await expect(page.getByText('1 / 2')).toBeVisible()
  await page.getByLabel('Type the word for this meaning').fill('alpha')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('2 / 2')).toBeVisible()
})
