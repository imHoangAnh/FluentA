import { expect, test } from '@playwright/test'
import { loginSeededUser } from './support/auth-fixture.js'

test('Review modal reports the due count for all owned vocabulary boards', async ({ page }) => {
  const { headers } = await loginSeededUser(page, { prefix: 'spaced-daily-planning' })

  const boardResponse = await page.request.post('https://localhost:7000/api/v1/vocabs/boards', {
    headers,
    data: { name: 'Daily Planning', language: 'en' },
  })
  expect(boardResponse.status()).toBe(201)
  const board = (await boardResponse.json()).data
  const pageResponse = await page.request.post(`https://localhost:7000/api/v1/vocabs/boards/${board.id}/pages`, {
    headers,
    data: { name: 'Today' },
  })
  expect(pageResponse.status()).toBe(201)
  const vocabPage = (await pageResponse.json()).data
  for (const word of ['first', 'second']) {
    const response = await page.request.post(`https://localhost:7000/api/v1/vocabs/pages/${vocabPage.id}/words`, {
      headers,
      data: { word, meaning: word, ipaPronunciation: `/${word}/`, type: 'other', example: `${word} example` },
    })
    expect(response.status()).toBe(201)
  }

  const dashboardResponse = await page.request.get('https://localhost:7000/api/v1/review/dashboard?timeZoneId=UTC', { headers })
  expect(dashboardResponse.status()).toBe(200)
  const dashboard = (await dashboardResponse.json()).data
  expect(dashboard).toEqual(expect.objectContaining({ localDate: expect.any(String), dueCount: expect.any(Number) }))

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('review-due-count')).toHaveText(String(dashboard.dueCount))
  await expect(page.getByRole('button', { name: 'Start review' })).toBeDisabled()
})
