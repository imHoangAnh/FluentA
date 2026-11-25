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
  }],
}

async function mockReviewApis(page) {
  let currentSession = structuredClone(session)
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/review/dashboard')) return json({ localDate: '2026-07-14', dueCount: 1 })
    if (path.endsWith('/review/sessions') && request.method() === 'POST') return json(currentSession)
    if (path.endsWith('/review/sessions/review-session') && request.method() === 'GET') return json(currentSession)
    if (path.endsWith('/review/sessions/review-session/answers')) {
      currentSession = {
        ...currentSession,
        status: 'completed',
        completedWords: 1,
        currentItemIndex: null,
        items: [{
          ...currentSession.items[0],
          isReviewed: true,
          result: 'correct',
          levelBefore: 0,
          levelAfter: 1,
          nextReviewDateBefore: '2026-07-14',
          nextReviewDateAfter: '2026-07-16',
        }],
      }
      return json({
        itemId: 'item-1',
        wordId: 'word-1',
        correct: true,
        isReviewed: true,
        result: 'correct',
        levelBefore: 0,
        levelAfter: 1,
        nextReviewDateBefore: '2026-07-14',
        nextReviewDateAfter: '2026-07-16',
        completedWords: 1,
        currentItemIndex: null,
        sessionStatus: 'completed',
      })
    }
    return json({ message: 'Unexpected Review request' }, 503)
  })
}

test('Review opens its due-count modal and grades Meaning to Word for each due word', async ({ page }) => {
  await mockReviewApis(page)
  await page.goto('/review')
  await expect(page.getByTestId('review-page')).toContainText('Open the Review dialog')

  await page.getByRole('button', { name: 'Open Review' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('review-due-count')).toHaveText('1')
  await expect(page.getByText('word ready to review')).toBeVisible()
  await page.getByRole('button', { name: 'Start review' }).click()

  await expect(page).toHaveURL('/review/sessions/review-session')
  await expect(page.getByTestId('active-review-card')).toBeVisible()
  await expect(page.getByText('Read the meaning, type the word.')).toBeVisible()
  await expect(page.getByText('the first letter of the Greek alphabet')).toBeVisible()
  await expect(page.getByText('CONTEXT', { exact: true })).toHaveCount(0)
  await page.getByLabel('Type the word').fill('alpha')
  await page.getByLabel('Type the word').press('Enter')
  await expect(page.getByRole('status')).toContainText('Correct')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Review Complete' })).toBeVisible()
  await expect(page.getByText('100% Accuracy')).toBeVisible()
})
