import { expect, test } from '@playwright/test'

const user = {
  id: 'settings-redesign-user',
  email: 'learner@fluenta.local',
  fullName: 'FluentA Learner',
  bio: 'Learning a little every day.',
  avatarDownloadUrl: null,
  isEmailVerified: true,
}

const levelFiveWords = [
  {
    wordId: 'word-active-1',
    word: 'meticulous',
    boardId: 'board-1',
    boardName: 'IELTS',
    pageId: 'page-1',
    pageName: 'Academic words',
    status: 'active',
    lastReviewDate: '2026-07-20T08:00:00Z',
  },
  {
    wordId: 'word-active-2',
    word: 'resilient',
    boardId: 'board-1',
    boardName: 'IELTS',
    pageId: 'page-2',
    pageName: 'Speaking',
    status: 'active',
    lastReviewDate: '2026-07-21T08:00:00Z',
  },
  {
    wordId: 'word-inactive',
    word: 'ubiquitous',
    boardId: 'board-2',
    boardName: 'TOEIC',
    pageId: 'page-3',
    pageName: 'Archived',
    status: 'inactive',
    lastReviewDate: null,
  },
]

function json(data) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ data }) }
}

async function mockSettingsApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/me')) return route.fulfill(json(user))
    if (path.endsWith('/practice/settings')) return route.fulfill(json({ modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] }))
    if (path.endsWith('/review/level-five/remove')) return route.fulfill(json(2))
    if (path.endsWith('/review/level-five')) return route.fulfill(json(levelFiveWords))
    if (path.endsWith('/settings')) {
      return route.fulfill(json({
        profile: user,
        practiceSettings: { modeSequence: ['dictation', 'meaningToWord', 'pronunciation'] },
      }))
    }

    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Unmocked Settings proof route' }) })
  })
}

for (const viewport of [
  { name: 'mobile', width: 320, height: 780 },
  { name: 'tablet-narrow', width: 768, height: 900 },
  { name: 'tablet-wide', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`Settings workspace redesign at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockSettingsApis(page)

    await page.goto('http://localhost:5173/profile')
    await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()

    for (const [name, heading] of [
      ['Practice', 'Practice'],
      ['Level 5', 'Level 5 words'],
      ['Profile', 'Profile'],
    ]) {
      await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name, exact: true }).click()
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }

    await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name: 'Level 5', exact: true }).click()
    await page.getByRole('button', { name: /Filter Level 5 words/ }).click()
    await expect(page.getByRole('menuitemradio', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('menuitemradio')).toHaveCount(3)
    await page.keyboard.press('Escape')

    await page.getByRole('checkbox', { name: 'Select all visible active words' }).check()
    await expect(page.getByText('2 words selected')).toBeVisible()
    await page.getByRole('button', { name: 'Remove selected' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Remove selected words?' })).toBeVisible()
    await expect(page.getByText('2 words will become inactive. Review history will be preserved.')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remove selected' })).toBeFocused()

    const tableOverflow = await page.locator('table').evaluate((table) => {
      const container = table.parentElement
      return container ? container.scrollWidth >= container.clientWidth : false
    })
    expect(tableOverflow).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.screenshot({ path: testInfo.outputPath(`settings-${viewport.name}.png`), fullPage: true })
  })
}
