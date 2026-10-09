import { expect, test } from '@playwright/test'

const user = { id: 'e32-user', email: 'e32@fluenta.local', fullName: 'Pronunciation Learner', isEmailVerified: true }
const word = {
  itemId: 'item-1', wordId: 'word-1', position: 0, word: 'countryside', meaning: 'vùng nông thôn',
  ipaPronunciation: '/kʌntrisaɪd/', type: 'noun', context: `We live in the countryside. ${'A long usage context to check wrapping. '.repeat(12)}`, example: 'I enjoy the countryside.',
  synonyms: null, antonyms: null, isReviewed: false, result: null, levelBefore: null, levelAfter: null,
  nextReviewDateBefore: null, nextReviewDateAfter: null, pronunciationAttemptCount: 0,
}
const syllable = (text, accuracyScore, sounds) => ({
  text, accuracyScore, phonemes: sounds.map(([text, accuracyScore]) => ({ text, accuracyScore, correct: accuracyScore >= 70 })),
})
const countryside = [
  syllable('kʌn', 88, [['k', 79], ['ʌ', 88], ['n', 100]]),
  syllable('tɹi', 69, [['t', 67], ['ɹ', 66], ['i', 74]]),
  syllable('saɪd', 86, [['s', 100], ['aɪ', 88], ['d', 73]]),
]
const phrase = [
  ['Today', [syllable('tə', 79, [['t', 77], ['ə', 87]]), syllable('deɪ', 90, [['d', 94], ['eɪ', 88]])]],
  ['was', [syllable('wɑz', 100, [['w', 100], ['ɑ', 100], ['z', 100]])]],
  ['a', [syllable('ə', 100, [['ə', 100]])]],
  ['beautiful', [syllable('bju', 100, [['b', 100], ['ju', 100]]), syllable('tɪ', 100, [['t', 100], ['ɪ', 100]]), syllable('fəl', 100, [['f', 100], ['ə', 100], ['l', 100]])]],
  ['day', [syllable('deɪ', 55, [['d', 65], ['eɪ', 53]])]],
].map(([text, syllables]) => ({ text, accuracyScore: 94, units: [], syllables }))

async function installFakeMicrophone(page) {
  await page.addInitScript(() => {
    const node = () => ({ connect: () => undefined, disconnect: () => undefined })
    class FakeAudioContext {
      constructor() { this.sampleRate = 16_000; this.destination = node() }
      createMediaStreamSource() { return node() }
      createScriptProcessor() { return { ...node(), onaudioprocess: null } }
      createGain() { return { ...node(), gain: { value: 0 } } }
      close() { return Promise.resolve() }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => undefined }] }) },
    })
    window.speechSynthesis.speak = () => undefined
    window.speechSynthesis.cancel = () => undefined
  })
}
async function recordOnce(page) {
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.getByRole('button', { name: 'Stop recording' }).click()
}
function practiceSession() {
  return {
    sessionId: 'practice-session-1', pageId: 'page-1', pageName: 'Practice deck', boardId: 'board-1',
    boardName: 'Practice board', boardLanguage: 'en', status: 'active', currentItemIndex: 0,
    items: [{ ...word, currentStep: 'pronunciation', alreadyInReview: true, answerSlots: [], selectedLevel: null, isCompleted: false }],
    startedAt: '2026-07-20T00:00:00Z', completedAt: null,
  }
}
function reviewSession() {
  return {
    sessionId: 'review-session-1', localDate: '2026-07-20', startedAt: '2026-07-20T00:00:00Z', completedAt: null,
    status: 'active', totalWords: 1, completedWords: 0, currentItemIndex: 0,
    items: [{ ...word, word: 'Today was a beautiful day.', ipaPronunciation: null, type: null, mode: 'listenAndRepeat' }],
  }
}

test('Practice shows syllables, keeps unlimited retries, and honors Already in review', async ({ page }, testInfo) => {
  await installFakeMicrophone(page)
  const outcomes = [422, 503, false, false, true]
  const audioBodies = []
  let current = practiceSession()
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/practice/sessions/practice-session-1')) return json(current)
    if (path.endsWith('/practice/sessions/practice-session-1/pronunciation-attempts')) {
      audioBodies.push(request.postDataBuffer())
      const outcome = outcomes.shift()
      if (typeof outcome === 'number') return json({ message: 'Provider error' }, outcome)
      current = { ...current, items: [{ ...current.items[0], currentStep: outcome ? 'recap' : 'pronunciation', pronunciationAttemptCount: audioBodies.length - 2 }] }
      return json({
        itemId: 'item-1', isCorrect: outcome, attemptNumber: audioBodies.length - 2, attemptsRemaining: null,
        nextStep: outcome ? 'recap' : 'pronunciation', currentItemIndex: 0, status: 'active',
        assessment: { correct: outcome, accuracyScore: outcome ? 88 : 76, completenessScore: 100, feedbackMode: 'syllable',
          words: [{ text: 'countryside', accuracyScore: 88, units: [], syllables: countryside }] },
      })
    }
    return json({ message: path }, 503)
  })
  await page.goto('/practice/practice-session-1')
  await expect(page.getByText('countryside', { exact: true })).toBeVisible()
  for (let i = 0; i < 2; i++) {
    await recordOnce(page)
    await expect(page.getByRole('alert')).toContainText('Your recording was not saved')
  }
  for (let i = 0; i < 2; i++) {
    await recordOnce(page)
    await expect(page.getByTestId('pronunciation-feedback')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  }
  await recordOnce(page)
  const feedback = page.getByTestId('pronunciation-feedback')
  await expect(feedback).toHaveText('/kʌn//tɹi//saɪd/')
  const first = page.getByRole('button', { name: 'Green syllable /kʌn/' })
  await first.hover()
  await expect(page.locator('.pronunciation-phoneme-tooltip')).toHaveText('/k//ʌ//n/')
  await expect(page.getByLabel('Yellow phoneme k')).toHaveCSS('color', 'rgb(153, 100, 0)')
  await page.screenshot({ path: testInfo.outputPath('word-feedback.png'), fullPage: true })
  await first.focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.pronunciation-phoneme-tooltip')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Listen to pronunciation' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Green syllable /saɪd/' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Listen to pronunciation' })).toBeFocused()
  await page.setViewportSize({ width: 320, height: 900 })
  if (testInfo.project.use.hasTouch) await first.tap()
  else await first.click()
  const bounds = await page.locator('.pronunciation-phoneme-tooltip').boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(feedback).toHaveCount(0)
  await expect(page.getByText('Already in review', { exact: true })).toBeVisible()
  const recap = page.getByTestId('active-practice-card')
  await expect(recap).toContainText('Meaning')
  await expect(recap).toContainText('Usage context')
  await expect(recap).toContainText('Example')
  await expect(recap.getByTestId('practice-review-level-0')).toBeDisabled()
  expect(await recap.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(audioBodies).toHaveLength(5)
  expect(audioBodies.every(body => body && body.length > 0)).toBe(true)
})

for (const finalCorrect of [false, true]) test(`Review phrase keeps two attempts and original correctness (${finalCorrect})`, async ({ page }, testInfo) => {
  await installFakeMicrophone(page)
  const outcomes = [422, false, finalCorrect]
  let assessmentCount = 0
  let current = reviewSession()
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/review/sessions/review-session-1')) return json(current)
    if (path.endsWith('/review/sessions/review-session-1/pronunciation-attempts')) {
      const correct = outcomes.shift()
      if (correct === 422) return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: [{ code: 'PRONUNCIATION_NOT_RECOGNIZED', message: 'No speech' }] }) })
      assessmentCount += 1
      const isFinal = assessmentCount === 2
      const result = isFinal ? (correct ? 'correct' : 'wrong') : null
      current = { ...current, status: isFinal ? 'completed' : 'active', completedWords: isFinal ? 1 : 0,
        currentItemIndex: isFinal ? null : 0, items: [{ ...current.items[0], pronunciationAttemptCount: assessmentCount, isReviewed: isFinal, result }] }
      return json({
        itemId: 'item-1', wordId: 'word-1', correct, attemptsUsed: assessmentCount, attemptsRemaining: isFinal ? 0 : 1,
        isReviewed: isFinal, result, levelBefore: isFinal ? 1 : null, levelAfter: isFinal ? 0 : null,
        nextReviewDateBefore: null, nextReviewDateAfter: null, completedWords: isFinal ? 1 : 0,
        currentItemIndex: isFinal ? null : 0, sessionStatus: isFinal ? 'completed' : 'active',
        assessment: { correct, accuracyScore: 98, completenessScore: 100, feedbackMode: 'syllable', words: phrase },
      })
    }
    return json({ message: path })
  })
  await page.goto('/review/sessions/review-session-1')
  await recordOnce(page)
  await expect(page.getByText(/No speech was recognized/)).toBeVisible()
  await expect(page.getByText('Attempt 1 of 2')).toBeVisible()
  await recordOnce(page)
  await expect(page.getByTestId('pronunciation-feedback')).toHaveText('/tə//deɪ//wɑz//ə//bju//tɪ//fəl//deɪ/')
  await expect(page.getByText('Attempt 2 of 2')).toBeVisible()
  expect(assessmentCount).toBe(1)
  await page.getByRole('button', { name: 'Continue' }).click()
  await recordOnce(page)
  await page.getByRole('button', { name: 'Red syllable /deɪ/' }).hover()
  await expect(page.locator('.pronunciation-phoneme-tooltip')).toHaveText('/d//eɪ/')
  await expect(page.getByLabel('Red phoneme eɪ')).toHaveCSS('color', 'rgb(192, 57, 43)')
  await expect(page.getByText('Today was a beautiful day.', { exact: true })).toHaveCount(1)
  await expect(page.getByText(/Pronunciation needs another try|Not quite|Nice work/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('phrase-feedback.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Review complete' })).toBeVisible()
  expect(assessmentCount).toBe(2)
})
