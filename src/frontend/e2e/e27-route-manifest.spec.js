import { expect, test } from '@playwright/test'

const user = {
  id: 'e27-route-proof-user',
  email: 'route-proof@fluenta.local',
  fullName: 'Route Proof Learner',
  isEmailVerified: true,
  avatarUrl: null,
}

const publicRoutes = [
  ['/login', 'Welcome back'],
  ['/register', 'Create your account'],
  ['/verify-email', 'Verify your email'],
  ['/forgot-password', 'Reset your password'],
  ['/reset-password', 'Choose a new password'],
  ['/auth/google/callback', 'Google sign-in'],
]

const protectedRoutes = [
  ['/', 'Dashboard Overview', 'Overview'],
  ['/vocabulary', 'Vocabulary', 'Vocabulary'],
  ['/todo', 'Todo', 'Todo'],
  ['/countdowns', 'Countdowns', 'Countdowns'],
  ['/flashcards', 'Flashcards', 'Flashcard'],
  ['/flashcards/practice', 'Practice', 'Practice'],
  ['/habits', 'Habits', 'Habits'],
  ['/habits/route-proof/stats', 'Habit statistics', 'Habits'],
  ['/journal', 'Journal', 'Journal'],
  ['/notes', 'Notes', 'Notes'],
  ['/kanban', 'Kanban', 'Kanban'],
  ['/pomodoro', 'Pomodoro', 'Pomodoro'],
  ['/notifications', 'Notifications', null],
  ['/settings/profile', 'Settings', 'Settings'],
  ['/settings/practice', 'Settings', 'Settings'],
  ['/settings/review', 'Settings', 'Settings'],
  ['/settings/level5', 'Settings', 'Settings'],
  ['/review', 'Review', 'Review'],
  ['/flashcards/pages/route-proof', 'Flashcard viewer', 'Flashcard'],
  ['/flashcards/pages/route-proof/practice', 'Practice', 'Practice'],
]

async function mockReleaseApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/refresh')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'e27-route-proof-token', user } }) })
      return
    }
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) })
      return
    }
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Deterministic route-manifest fixture' }) })
  })
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 1024, height: 900 },
]) {
  test(`E27 ${viewport.name} public and protected route manifest`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockReleaseApis(page)

    for (const [path, heading] of publicRoutes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      await expect(page.locator('main.ds-root')).toBeVisible()
      await expect(page.getByLabel('Primary navigation')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }

    await page.goto('/login')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus-visible')).toBeVisible()
    await page.screenshot({ path: `test-results/e27-login-${viewport.name}.png`, fullPage: true })

    for (const [path, heading, activeNavigation] of protectedRoutes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible()
      await expect(page.getByLabel('Primary navigation')).toBeVisible()
      if (activeNavigation) {
        await expect(page.getByLabel('Primary navigation').getByRole('link', { name: activeNavigation, exact: true })).toHaveAttribute('aria-current', 'page')
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }

    await page.goto('/pomodoro')
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
    const reducedDuration = await page.locator('.ds-root').evaluate((root) => {
      const candidate = root.querySelector('button, a')
      return candidate ? getComputedStyle(candidate).transitionDuration : ''
    })
    expect(reducedDuration).toMatch(/1e-05s|0\.00001s|0\.01ms|0s/)
    await page.screenshot({ path: `test-results/e27-pomodoro-${viewport.name}.png`, fullPage: true })

    await page.goto('/settings/profile')
    await page.screenshot({ path: `test-results/e27-settings-${viewport.name}.png`, fullPage: true })
  })
}
