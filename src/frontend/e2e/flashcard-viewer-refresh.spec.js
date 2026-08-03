import { expect, test } from '@playwright/test'

const appUrl = 'http://localhost:5173'
const user = {
  id: 'flashcard-refresh-user',
  email: 'flashcard-refresh@fluenta.local',
  fullName: 'Flashcard Refresh Learner',
  isEmailVerified: true,
}

const word = {
  id: 'card-long-1',
  wordId: 'word-long-1',
  word: 'pneumonoultramicroscopicsilicovolcanoconiosis-with-an-intentionally-long-suffix',
  wordClass: 'noun',
  ipaPronunciation: '/ˌnjuː.mə.nəʊ.ʌl.trə.maɪ.krəˈskɒp.ɪk.sɪl.ɪ.kəʊ.vɒl.keɪ.nəʊ.kəʊ.niˈəʊ.sɪs/',
  meaningVn: `một nghĩa tiếng Việt dài để kiểm tra khả năng xuống dòng hợp lý trong khuôn flashcard ${'mở rộng '.repeat(20)}`,
  meaningEn: `a deliberately long definition that must wrap inside the bounded flashcard instead of widening the page ${'with additional explanatory context '.repeat(24)}`,
  example: `This intentionally long example remains readable inside the same fixed card ${'without escaping its border '.repeat(20)}`,
  synonyms: `related term, close expression, ${'supporting synonym, '.repeat(12)}`,
  antonyms: `opposite term, contrasting expression, ${'supporting antonym, '.repeat(12)}`,
  note: null,
  isInReview: false,
  reviewLevel: null,
  nextReviewDate: null,
  lapseCount: 0,
}

async function mockViewerApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data }) })

    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/flashcards/pages/page-long/words')) {
      return json({ pageId: 'page-long', boardId: 'board-long', pageName: 'Long content', boardLanguage: 'en', words: [word] })
    }

    return json({ message: `Unexpected Flashcard refresh request: ${path}` }, 503)
  })
}

test('Flashcard refresh keeps rich content bounded and audio independent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    window.__flashcardSpeech = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text
          this.lang = ''
          this.voice = null
        }
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        getVoices() { return [] },
        speak(utterance) { window.__flashcardSpeech.push({ text: utterance.text, lang: utterance.lang }) },
      },
    })
  })
  await mockViewerApis(page)
  await page.goto(`${appUrl}/flashcards/pages/page-long`)

  const stage = page.getByTestId('flashcard-stage')
  await expect(stage).toContainText(`${word.word} (noun)`)
  await expect(stage).toContainText(word.ipaPronunciation)
  await expect(stage).not.toContainText(`/${word.ipaPronunciation}/`)

  const audioButton = page.getByRole('button', { name: `Listen to ${word.word}` })
  await audioButton.click()
  await expect.poll(() => page.evaluate(() => window.__flashcardSpeech)).toEqual([{ text: word.word, lang: 'en-US' }])
  await audioButton.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.__flashcardSpeech)).toHaveLength(2)
  await expect(page.getByRole('button', { name: 'Show card back' })).toBeVisible()

  const desktopBox = await stage.boundingBox()
  const contentBox = await page.getByTestId('flashcard-viewer-content').boundingBox()
  expect(desktopBox.width).toBeGreaterThan(760)
  expect(desktopBox.width).toBeLessThan(830)
  expect(desktopBox.height).toBe(500)
  expect(Math.abs(desktopBox.width - (contentBox.width))).toBeLessThan(2)

  await page.getByRole('button', { name: 'Show card back' }).focus()
  await page.keyboard.press('Enter')
  await expect(stage).toHaveAttribute('data-density', 'dense')
  const backText = await stage.textContent()
  const orderedLabels = ['Definition:', 'Meaning:', 'Example:', 'Synonyms:', 'Antonyms:']
  for (let index = 1; index < orderedLabels.length; index += 1) {
    expect(backText.indexOf(orderedLabels[index])).toBeGreaterThan(backText.indexOf(orderedLabels[index - 1]))
  }

  const desktopOverflow = await page.getByTestId('flashcard-back-content').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(desktopOverflow.scrollWidth).toBeLessThanOrEqual(desktopOverflow.clientWidth)
  expect(desktopOverflow.scrollHeight).toBeGreaterThan(desktopOverflow.clientHeight)

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(page.getByRole('complementary', { name: 'Primary navigation' })).toHaveCSS('width', '84px')
  const mobileBox = await stage.boundingBox()
  const mobileContentBox = await page.getByTestId('flashcard-viewer-content').boundingBox()
  expect(Math.abs(mobileBox.width - mobileContentBox.width)).toBeLessThan(2)
  expect(mobileBox.height).toBe(400)
  const overflowingElements = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .map((element) => {
      const box = element.getBoundingClientRect()
      return { tag: element.tagName, text: element.textContent?.trim().slice(0, 60), left: box.left, right: box.right, width: box.width }
    })
    .filter((box) => box.left < -1 || box.right > window.innerWidth + 1))
  expect(overflowingElements).toEqual([])
})
