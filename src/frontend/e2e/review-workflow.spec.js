import { expect, test } from '@playwright/test'

const user = { id: 'review-user', email: 'review@fluenta.local', fullName: 'Review Learner', isEmailVerified: true }
const session = {
  sessionId: 'review-session',
  localDate: '2026-07-14',
  startedAt: '2026-07-14T00:00:00Z',
  completedAt: null,
  status: 'active',
  totalWords: 1,
  completedWords: 0,
  currentItemIndex: 0,
  items: [{
    itemId: 'item-1',
    wordId: 'word-1',
    position: 0,
    mode: 'meaningToWord',
    language: 'en',
    word: 'alpha',
    meaning: 'the first letter of the Greek alphabet',
    ipaPronunciation: '/ˈælfə/',
    type: 'noun',
    context: null,
    example: 'alpha example',
    synonyms: null,
    antonyms: null,
    isReviewed: false,
    result: null,
    levelBefore: null,
    levelAfter: null,
    nextReviewDateBefore: null,
    nextReviewDateAfter: null,
    pronunciationAttemptCount: 0,
  }],
}

async function mockReviewApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/review/dashboard')) return json({ localDate: '2026-07-14', dueCount: 1 })
    if (path.endsWith('/review/sessions') && request.method() === 'POST') return json(session)
    if (path.endsWith('/review/sessions/review-session') && request.method() === 'GET') return json(session)
    if (path.endsWith('/review/sessions/review-session/answers')) {
      return json({
        itemId: 'item-1',
        wordId: 'word-1',
        correct: true,
        attemptsUsed: 1,
        attemptsRemaining: 0,
        isReviewed: true,
        result: 'correct',
        levelBefore: 0,
        levelAfter: 1,
        nextReviewDateBefore: '2026-07-14',
        nextReviewDateAfter: '2026-07-16',
        completedWords: 1,
        currentItemIndex: null,
        sessionStatus: 'completed',
        assessment: null,
      })
    }
    return json({ message: 'Unexpected Review request' }, 503)
  })
}

test('Review opens its due-count modal and grades one persisted mode per due word', async ({ page }) => {
  await mockReviewApis(page)
  await page.goto('/review')
  await expect(page.getByTestId('review-page')).toContainText('Open the Review dialog')

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('review-due-count')).toHaveText('1')
  await expect(page.getByText('word due today')).toBeVisible()
  await page.getByRole('button', { name: 'Start review' }).click()

  await expect(page).toHaveURL('/review/sessions/review-session')
  await expect(page.getByTestId('active-review-card')).toHaveClass(/review-card--meaningToWord/)
  await expect(page.getByText('the first letter of the Greek alphabet')).toBeVisible()
  await page.getByLabel('Type the word').fill('alpha')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Correct')
})
