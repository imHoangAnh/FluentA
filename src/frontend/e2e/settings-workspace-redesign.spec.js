import { expect, test } from '@playwright/test'

const profile = {
  id: 'settings-redesign-user',
  email: 'learner@fluenta.local',
  fullName: 'FluentA Learner',
  bio: 'Learning a little every day.',
  avatarDownloadUrl: null,
  isEmailVerified: true,
}

async function mockSettingsApis(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })

    if (path.endsWith('/auth/me')) return json(profile)
    if (path.endsWith('/settings')) return json({ profile })
    if (path.endsWith('/profile') && request.method() === 'PUT') {
      const payload = request.postDataJSON()
      return json({ ...profile, fullName: payload.fullName, bio: payload.bio })
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
  test(`Profile Settings remains usable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockSettingsApis(page)

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible()

    if (viewport.name === 'desktop') {
      await page.getByLabel('Full name').fill('FluentA Learner Updated')
      await page.getByRole('button', { name: 'Save profile' }).click()
      await expect(page.getByText('Profile saved.')).toBeVisible()
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`settings-${viewport.name}.png`), fullPage: true })
  })
}
