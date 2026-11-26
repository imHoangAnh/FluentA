import { expect, test } from '@playwright/test'

const user = {
  id: 'e29-practice-user',
  email: 'e29-practice@fluenta.local',
  fullName: 'Practice Library Learner',
  isEmailVerified: true,
}

const board = {
  id: 'board-1',
  name: 'Practice board',
  language: 'en',
  pageCount: 12,
  createdAt: '2026-07-20T08:00:00Z',
  updatedAt: '2026-07-20T08:00:00Z',
}

const decks = Array.from({ length: 12 }, (_, index) => ({
  pageId: `page-${index + 1}`,
  pageName: `Practice deck ${index + 1}`,
  boardId: board.id,
  boardName: board.name,
  wordCount: index === 11 ? 0 : 1,
}))

const session = {
  sessionId: 'practice-session-1',
  pageId: 'page-1',
  pageName: 'Practice deck 1',
  boardId: board.id,
  boardName: board.name,
  boardLanguage: 'en',
  status: 'active',
  currentItemIndex: 0,
  items: [{
    itemId: 'item-1',
    wordId: 'word-1',
    position: 0,
    word: 'mitigate',
    meaning: 'make less severe',
    ipaPronunciation: '/ˈmɪt.ɪ.ɡeɪt/',
    type: 'verb',
    context: null,
    example: 'We mitigate risk.',
    synonyms: null,
    antonyms: null,
    currentStep: 'dictation',
    alreadyInReview: false,
    answerSlots: [],
    selectedLevel: null,
    isCompleted: false,
  }],
  startedAt: '2026-07-20T08:00:00Z',
  completedAt: null,
}

async function mockPracticeLibraryApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })

    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/vocabs/boards')) return json([board])
    if (path.endsWith('/practice/decks')) {
      const url = new URL(request.url())
      const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase()
      const filtered = decks.filter((deck) => deck.pageName.toLocaleLowerCase().includes(search))
      return json({ items: filtered, page: Number(url.searchParams.get('page') ?? 1), pageSize: 20, totalCount: filtered.length })
    }
    if (path.endsWith('/practice/sessions') && request.method() === 'POST') return json(session)
    if (path.endsWith('/practice/sessions/practice-session-1')) return json(session)
    return json({ message: 'Unexpected Practice request' }, 503)
  })
}

test('Practice searches deck titles and launches the fixed learning flow', async ({ page }) => {
  await mockPracticeLibraryApis(page)
  await page.goto('/practice')

  const firstDeck = page.getByTestId('practice-deck-page-1')
  const emptyDeck = page.getByTestId('practice-deck-page-12')
  await expect(firstDeck).toBeEnabled()
  await expect(emptyDeck).toBeDisabled()

  await page.getByRole('textbox', { name: 'Search deck titles' }).fill('deck 3')
  await expect(page.getByTestId('practice-deck-page-3')).toBeVisible()
  await expect(firstDeck).toHaveCount(0)

  await page.getByTestId('practice-deck-page-3').click()
  await expect(page.getByRole('heading', { name: 'Start practice' })).toBeVisible()
  await expect(page.getByText('Dictation', { exact: true })).toBeVisible()
  await expect(page.getByText('Word to meaning', { exact: true })).toBeVisible()
  await expect(page.getByText('Pronunciation', { exact: true })).toBeVisible()
  await expect(page.getByText('Recap', { exact: true })).toBeVisible()
  await expect(page.getByText('Shuffle', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Start practice' }).click()
  await expect(page).toHaveURL('/practice/practice-session-1')
  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--dictation/)
  await expect(page.getByText('Listen carefully, then type the word you hear')).toBeVisible()
})

for (const [width, expectedColumns] of [[1440, 3], [1024, 3], [375, 1], [320, 1]]) {
  test(`Practice deck dashboard stays within ${width}px and uses ${expectedColumns} columns`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockPracticeLibraryApis(page)
    await page.goto('/practice')

    const cards = page.locator('[data-testid^="practice-deck-"]')
    await expect(cards).toHaveCount(12)
    await expect(cards.nth(11)).toBeDisabled()
    const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { x: box.x, y: box.y, height: box.height }
    }))
    expect(boxes.slice(0, expectedColumns).every((box) => Math.abs(box.y - boxes[0].y) < 2)).toBe(true)
    expect(boxes[expectedColumns].y).toBeGreaterThan(boxes[0].y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
