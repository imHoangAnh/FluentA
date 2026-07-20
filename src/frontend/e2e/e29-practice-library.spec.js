import { expect, test } from '@playwright/test'

const user = {
  id: 'e29-practice-user',
  email: 'e29-practice@fluenta.local',
  fullName: 'Practice Library Learner',
  isEmailVerified: true,
}

const words = [{
  id: 'card-1',
  wordId: 'word-1',
  word: 'mitigate',
  wordClass: 'verb',
  ipaPronunciation: '/ˈmɪt.ɪ.ɡeɪt/',
  meaningVn: 'giam nhe',
  meaningEn: 'make less severe',
  example: 'We mitigate risk.',
  isInReview: false,
  reviewLevel: null,
  nextReviewDate: null,
  lapseCount: 0,
}]

const pages = Array.from({ length: 12 }, (_, index) => ({
  pageId: `page-${index + 1}`,
  pageName: `Practice deck ${index + 1}`,
  words: index === 11 ? [] : words.map((word) => ({ ...word, id: `card-${index + 1}`, wordId: `word-${index + 1}` })),
  isPracticed: false,
}))

async function mockPracticeLibraryApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })

    if (path.endsWith('/auth/refresh')) return json({ accessToken: 'e29-token', user })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/flashcards/pages')) return json([{ boardId: 'board-1', boardName: 'Practice board', boardLanguage: 'en', pages }])
    if (path.endsWith('/practice/settings')) return json({ modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] })
    if (path.endsWith('/flashcards/pages/page-1/words')) return json({ pageId: 'page-1', boardId: 'board-1', pageName: 'Practice deck 1', boardLanguage: 'en', words })
    return json({ message: 'Unexpected E29 request' }, 503)
  })
}

test('E29 opens a query-selected deck, preserves Shuffle in the session URL, and removes legacy routes', async ({ page }) => {
  await mockPracticeLibraryApis(page)
  await page.goto('/practice?deck=page-1')

  await expect(page.getByRole('heading', { name: 'Start practice' })).toBeVisible()
  await expect(page.getByText('Dictation')).toBeVisible()
  await expect(page.getByText('Meaning → Word')).toBeVisible()
  await expect(page.getByText('Pronunciation')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5173/practice')

  await page.goto('/practice?deck=page-1')
  await expect(page.getByRole('heading', { name: 'Start practice' })).toBeVisible()
  await page.getByRole('button', { name: 'Shuffle' }).click()
  await page.getByRole('button', { name: 'Start practice' }).click()
  await expect(page).toHaveURL(/\/practice\/page-1\?order=shuffle$/)
  await expect(page.getByTestId('active-practice-card')).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/practice\/page-1\?order=shuffle$/)
  await expect(page.getByTestId('active-practice-card')).toBeVisible()

  await page.goto('/flashcards/practice')
  await expect(page).toHaveURL('http://127.0.0.1:5173/')
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
})

for (const route of ['/flashcards', '/practice']) {
  for (const [width, expectedFirstRow, expectedSecondRow] of [
    [1440, 10, true],
    [1024, 7, true],
    [375, 2, true],
    [320, 1, true],
  ]) {
    test(`E29 renders ${expectedFirstRow} compact ${route} deck cards per first row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await mockPracticeLibraryApis(page)
      await page.goto(route)

      const cards = page.locator('[data-testid^="flashcard-page-"]')
      await expect(cards).toHaveCount(12)
      await expect(cards.nth(11)).toHaveAttribute('aria-disabled', 'true')
      const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      }))

      expect(boxes.slice(0, expectedFirstRow).every((box) => Math.abs(box.y - boxes[0].y) < 2)).toBe(true)
      if (expectedSecondRow) expect(boxes[expectedFirstRow].y).toBeGreaterThan(boxes[0].y)
      expect(boxes.every((box) => box.height >= 90 && box.height <= 110)).toBe(true)
      expect(await cards.first().evaluate((element) => getComputedStyle(element).textAlign)).toBe('center')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
}
