import { expect, test } from '@playwright/test'

const user = { id: 'e32-user', email: 'e32@fluenta.local', fullName: 'Pronunciation Learner', isEmailVerified: true }
const word = {
  itemId: 'item-1',
  wordId: 'word-1',
  position: 0,
  word: 'go',
  meaning: 'move from one place to another',
  ipaPronunciation: '/ɡəʊ/',
  type: 'verb',
  context: `A usage context ${'with deliberately long text to verify the recap can wrap without widening the screen '.repeat(8)}`,
  example: 'I go to work.',
  synonyms: null,
  antonyms: null,
  isReviewed: false,
  result: null,
  levelBefore: null,
  levelAfter: null,
  nextReviewDateBefore: null,
  nextReviewDateAfter: null,
  pronunciationAttemptCount: 0,
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
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeEnabled()
  await page.getByRole('button', { name: 'Stop recording' }).click()
}

function practiceSession() {
  return {
    sessionId: 'practice-session-1',
    pageId: 'page-1',
    pageName: 'Practice deck',
    boardId: 'board-1',
    boardName: 'Practice board',
    boardLanguage: 'en',
    status: 'active',
    currentItemIndex: 0,
    items: [{ ...word, currentStep: 'pronunciation', alreadyInReview: true, answerSlots: [], selectedLevel: null, isCompleted: false }],
    startedAt: '2026-07-20T00:00:00Z',
    completedAt: null,
  }
}

function reviewSession() {
  return {
    sessionId: 'review-session-1',
    localDate: '2026-07-20',
    startedAt: '2026-07-20T00:00:00Z',
    completedAt: null,
    status: 'active',
    totalWords: 1,
    completedWords: 0,
    currentItemIndex: 0,
    items: [{ ...word, mode: 'listenAndRepeat' }],
  }
}

test('Practice pronunciation keeps retrying after provider errors and honors Already in review', async ({ page }) => {
  await installFakeMicrophone(page)
  const outcomes = [422, 503, false, false, true]
  const audioBodies = []
  const assessment = (correct) => ({
    correct,
    accuracyScore: correct ? 91 : 76,
    completenessScore: 100,
    feedbackMode: 'phoneme',
    words: [{ text: 'go', accuracyScore: correct ? 91 : 76, errorType: correct ? 'None' : 'Mispronunciation', units: [{ text: 'ɡ', correct }, { text: 'oʊ', correct: true }] }],
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/practice/sessions/practice-session-1')) return json(practiceSession())
    if (path.endsWith('/practice/sessions/practice-session-1/pronunciation-attempts')) {
      audioBodies.push(request.postDataBuffer())
      const outcome = outcomes.shift()
      if (outcome === 422) return json({ code: 'PRONUNCIATION_NOT_RECOGNIZED', message: 'No speech' }, 422)
      if (outcome === 503) return json({ code: 'PRONUNCIATION_UNAVAILABLE', message: 'Unavailable' }, 503)
      return json({
        itemId: 'item-1',
        assessment: assessment(outcome),
        isCorrect: outcome,
        attemptNumber: audioBodies.length - 2,
        attemptsRemaining: null,
        nextStep: outcome ? 'recap' : 'pronunciation',
        currentItemIndex: 0,
        status: 'active',
      })
    }
    return json({ message: path }, 503)
  })

  await page.goto('/practice/practice-session-1')
  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--pronunciation/)
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible()

  await recordOnce(page)
  await expect(page.getByText(/No speech was recognized/)).toBeVisible()
  await recordOnce(page)
  await expect(page.getByText(/did not use an attempt/)).toBeVisible()
  await recordOnce(page)
  await expect(page.getByText('Wrong, try again', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/Not quite/)).toBeVisible()
  await recordOnce(page)
  await expect(page.getByText(/Not quite/)).toBeVisible()
  await recordOnce(page)

  const recap = page.getByTestId('practice-answer-reveal')
  await expect(recap).toContainText('go (verb)')
  await expect(recap).toContainText('/ɡəʊ/')
  await expect(recap).toContainText('Context')
  await expect(recap).toContainText('Meaning')
  await expect(recap).toContainText('Example')
  await expect(recap.getByText('Already in review')).toBeVisible()
  await expect(recap.getByTestId('practice-review-level-0')).toBeDisabled()
  await page.setViewportSize({ width: 320, height: 900 })
  expect(await recap.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(audioBodies).toHaveLength(5)
  expect(audioBodies.every((body) => body && body.length > 0)).toBe(true)
})

test('Review pronunciation uses two attempts and completes the due word after the second failure', async ({ page }) => {
  await installFakeMicrophone(page)
  const outcomes = [422, false, false]
  let assessmentCount = 0
  const audioBodies = []

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/review/sessions/review-session-1')) return json(reviewSession())
    if (path.endsWith('/review/sessions/review-session-1/pronunciation-attempts')) {
      audioBodies.push(request.postDataBuffer())
      const outcome = outcomes.shift()
      if (outcome === 422) return json({ code: 'PRONUNCIATION_NOT_RECOGNIZED', message: 'No speech' }, 422)
      assessmentCount += 1
      const isFinal = assessmentCount === 2
      return json({
        itemId: 'item-1',
        wordId: 'word-1',
        correct: false,
        attemptsUsed: assessmentCount,
        attemptsRemaining: isFinal ? 0 : 1,
        isReviewed: isFinal,
        result: isFinal ? 'wrong' : null,
        levelBefore: isFinal ? 1 : null,
        levelAfter: isFinal ? 0 : null,
        nextReviewDateBefore: isFinal ? '2026-07-20' : null,
        nextReviewDateAfter: isFinal ? '2026-07-21' : null,
        completedWords: isFinal ? 1 : 0,
        currentItemIndex: isFinal ? null : 0,
        sessionStatus: isFinal ? 'completed' : 'active',
        assessment: { correct: false, accuracyScore: 76, completenessScore: 100, feedbackMode: 'phoneme', words: [] },
      })
    }
    return json({ message: path }, 503)
  })

  await page.goto('/review/sessions/review-session-1')
  await recordOnce(page)
  await expect(page.getByText(/No speech was recognized/)).toBeVisible()
  await expect(page.getByText('Attempt 1 of 2')).toBeVisible()

  await recordOnce(page)
  await expect(page.getByText('Not quite. One more attempt.')).toBeVisible()
  await expect(page.getByText('Attempt 2 of 2')).toBeVisible()
  expect(assessmentCount).toBe(1)

  await recordOnce(page)
  await expect(page.getByRole('status')).toHaveText('Wrong')
  await expect(page.getByRole('heading', { name: 'Review complete' })).toBeVisible({ timeout: 2_000 })
  await expect(page.getByText('You reviewed 1 word.')).toBeVisible()
  expect(assessmentCount).toBe(2)
  expect(audioBodies).toHaveLength(3)
})
