import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js'

async function createPracticeDeck(page, headers) {
  const boardResponse = await page.request.post('https://localhost:7000/api/v1/vocabs/boards', {
    headers,
    data: { name: 'Practice Workflow Board', language: 'en' },
  })
  expect(boardResponse.status()).toBe(201)
  const board = (await boardResponse.json()).data
  const pageResponse = await page.request.post(`https://localhost:7000/api/v1/vocabs/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Practice Workflow Deck' },
  })
  expect(pageResponse.status()).toBe(201)
  const vocabPage = (await pageResponse.json()).data
  const words = [
    ['mitigate', 'make less severe'],
    ['nuance', 'a subtle difference'],
    ['resilient', 'able to recover quickly'],
    ['precise', 'marked by exactness'],
  ]
  for (const [word, meaning] of words) {
    const response = await page.request.post(`https://localhost:7000/api/v1/vocabs/pages/${vocabPage.id}/words`, {
      headers,
      data: { word, meaning, ipaPronunciation: `/${word}/`, type: 'other', context: `${word} context`, example: `${word} example.` },
    })
    expect(response.status()).toBe(201)
  }
  return vocabPage
}

test('Practice follows Dictation, Word to meaning, pronunciation, then level recap', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => undefined
    window.speechSynthesis.cancel = () => undefined
  })

  const { headers } = await loginSeededUser(page, { prefix: 'practice-workflow' })
  const vocabPage = await createPracticeDeck(page, headers)

  await page.getByRole('link', { name: 'Practice', exact: true }).click()
  const deck = page.getByTestId(`practice-deck-${vocabPage.id}`)
  await expect(deck).toHaveAccessibleName('Practice Practice Workflow Deck, 4 words')
  await deck.click()
  await page.getByRole('button', { name: 'Start practice' }).click()

  await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/i)
  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--dictation/)
  await page.getByTestId('practice-answer-input').fill('mitigate')
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click()

  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--wordToMeaning/)
  await expect(page.getByText('Choose the meaning that matches this word')).toBeVisible()
  await page.getByRole('button', { name: /make less severe/ }).click()

  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--pronunciation/)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByTestId('practice-answer-reveal')).toBeVisible()
  await expect(page.getByText('Already in review')).toHaveCount(0)
  await page.getByTestId('practice-review-level-0').click()
  await expect(page.getByTestId('active-practice-card')).toHaveClass(/review-card--dictation/)
})
