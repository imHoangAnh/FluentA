import { expect, test } from '@playwright/test'

const user = { id: 'e32-user', email: 'e32@fluenta.local', fullName: 'Pronunciation Learner', isEmailVerified: true }
const word = {
  id: 'card-1',
  wordId: 'word-1',
  word: 'go',
  wordClass: 'verb',
  ipaPronunciation: '/ɡəʊ/',
  meaningVn: 'đi',
  meaningEn: `move from one place to another ${'while preserving a deliberately long definition inside the recap panel '.repeat(12)}`,
  example: 'I go to work.',
  isInReview: true,
  reviewLevel: 0,
  nextReviewDate: '2026-07-20',
  lapseCount: 0,
}

async function installFakeMicrophone(page) {
  await page.addInitScript(() => {
    const node = () => ({ connect: () => undefined, disconnect: () => undefined })
    class FakeAudioContext {
      constructor() {
        this.sampleRate = 16_000
        this.destination = node()
      }
      createMediaStreamSource() { return node() }
      createScriptProcessor() { return { ...node(), onaudioprocess: null } }
      createGain() { return { ...node(), gain: { value: 0 } } }
      close() { return Promise.resolve() }
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => undefined }] }) },
    })
    window.speechSynthesis.speak = () => undefined
    window.speechSynthesis.cancel = () => undefined
  })
}

async function recordOnce(page) {
  await page.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeEnabled()
  await page.getByRole('button', { name: 'Stop' }).click()
}

test('Practice pronunciation preserves attempts on 503 and offers one fresh two-attempt retry pair', async ({ page }) => {
  await installFakeMicrophone(page)
  const outcomes = [503, false, false, true]
  const audioBodies = []

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200, success = true) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(success ? { success: true, data } : { success: false, error: data }) })
    if (path.endsWith('/auth/refresh')) return json({ accessToken: 'e32-token', user })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/practice/settings')) return json({ modeSequence: ['pronunciation'] })
    if (path.endsWith('/flashcards/pages/page-1/words')) return json({ pageId: 'page-1', boardId: 'board-1', pageName: 'Pronunciation deck', boardLanguage: 'en', words: [word] })
    if (path.endsWith('/pronunciation/words/word-1/assessment')) {
      audioBodies.push(request.postDataBuffer())
      const outcome = outcomes.shift()
      if (outcome === 503) return json({ code: 'PRONUNCIATION_UNAVAILABLE', message: 'Unavailable' }, 503, false)
      return json({ correct: outcome })
    }
    return json({ code: 'UNEXPECTED', message: path }, 503, false)
  })

  await page.goto('/practice/page-1?order=sequential')
  await expect(page.getByTestId('active-practice-card')).toBeVisible()
  await expect(page.getByText(/Attempt 1 of 2/)).toBeVisible()

  await recordOnce(page)
  await expect(page.getByText(/did not use an attempt/)).toBeVisible()
  await expect(page.getByText(/Attempt 1 of 2/)).toBeVisible()

  await recordOnce(page)
  await expect(page.getByText('Wrong', { exact: true })).toBeVisible()
  await expect(page.getByText(/Attempt 2 of 2/)).toBeVisible()
  await recordOnce(page)
  await expect(page.getByRole('button', { name: /Retry · 2 more attempts/ })).toBeVisible()

  await page.getByRole('button', { name: /Retry · 2 more attempts/ }).click()
  await expect(page.getByText(/Attempt 1 of 2 · retry pair/)).toBeVisible()
  await recordOnce(page)
  await expect(page.getByText('Correct', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  const recap = page.getByTestId('practice-answer-reveal')
  await expect(recap).toContainText('go (verb)')
  await expect(recap).toContainText('/ɡəʊ/')
  await expect(recap).toContainText('Definition: move from one place to another')
  await expect(recap).toContainText('Meaning: đi')
  await expect(recap).toContainText('Example: I go to work.')
  await page.setViewportSize({ width: 320, height: 900 })
  expect(await recap.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(audioBodies).toHaveLength(4)
  expect(audioBodies.every((body) => body && body.length >= 44)).toBe(true)
})

test('Review pronunciation submits Wrong only after the second failed assessment and always shows recap', async ({ page }) => {
  await installFakeMicrophone(page)
  let assessmentCount = 0
  const reviewBodies = []
  const reviewSession = {
    sessionId: 'session-1', boardId: 'board-1', boardName: 'Review board', orderType: 'sequential', mode: 'random', startDisposition: 'started', startedAt: '2026-07-20T00:00:00Z', totalWords: 1,
    startOptions: { hasActiveSameDaySession: false, remainingWords: 1, requiresDecision: false },
    words: [{ ...word, mode: 'pronunciation' }],
  }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data }) })
    if (path.endsWith('/auth/refresh')) return json({ accessToken: 'e32-token', user })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/flashcards/pages')) return json([{ boardId: 'board-1', boardName: 'Review board', boardLanguage: 'en', pages: [{ pageId: 'page-1', pageName: 'Deck', isPracticed: false, words: [word] }] }])
    if (path.endsWith('/review/settings')) return json({ dailyLimit: 20, recapAfterAnswer: false })
    if (path.endsWith('/review/sessions')) return json(reviewSession)
    if (path.endsWith('/pronunciation/words/word-1/assessment')) {
      assessmentCount += 1
      return json({ correct: false })
    }
    if (path.endsWith('/review') && request.method() === 'POST') {
      reviewBodies.push(request.postDataJSON())
      return json({ wordId: 'word-1', reviewHistoryId: 'history-1', result: 'wrong', levelBefore: 0, levelAfter: 0, lapseCount: 1, nextReviewDate: '2026-07-21' })
    }
    return json({ message: path }, 503)
  })

  await page.goto('/review')
  await page.getByLabel('Vocabulary board').selectOption('board-1')
  await page.getByRole('button', { name: 'Start review' }).click()

  await recordOnce(page)
  await expect(page.getByText('Wrong', { exact: true })).toBeVisible()
  expect(reviewBodies).toHaveLength(0)
  await expect(page.getByText(/attempt 2 of 2/i)).toBeVisible()

  await recordOnce(page)
  const recap = page.getByTestId('review-answer')
  await expect(recap).toContainText('Wrong')
  await expect(recap).toContainText('go (verb)')
  await expect(recap).toContainText('/ɡəʊ/')
  await expect(recap).toContainText('Definition: move from one place to another')
  expect(assessmentCount).toBe(2)
  expect(reviewBodies).toEqual([expect.objectContaining({ correct: false, wordId: 'word-1' })])
})
