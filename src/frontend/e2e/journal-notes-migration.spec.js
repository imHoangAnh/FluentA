import { expect, test } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', 'base64')
const assetId = '11111111-1111-1111-1111-111111111111'
const imageHtml = `<p>Before image</p><img src="https://proof.test/image.png" data-asset-id="${assetId}" width="300" height="300" data-image-align="left"><p>After image</p>`

async function setupApi(page, feature, initialContent = imageHtml) {
  const date = '2026-10-08'
  let entry = { id: 'entry-1', title: 'Daily journal', name: 'Note page', boardId: 'board-1', content: initialContent, date, createdAt: `${date}T08:00:00Z`, updatedAt: `${date}T08:00:00Z` }
  const patches = []
  let fail = false
  let assetType
  await page.route('https://proof.test/image.png', route => route.fulfill({ contentType: 'image/png', body: png }))
  await page.route('https://proof.test/upload', route => route.fulfill({ status: 200 }))
  await page.route('**/hubs/**', route => route.fulfill({ status: 401 }))
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace('/api/v1', '')
    let data = []
    if (pathname === '/auth/me') data = { id: 'proof-user', email: 'proof@example.test', fullName: 'Editor Proof', isEmailVerified: true }
    else if (pathname === '/review/dashboard') data = { localDate: date, dueCount: 0 }
    else if (pathname === '/journal' && request.method() === 'GET') data = entry ? [entry] : []
    else if (pathname === '/journal/calendar') data = entry ? [{ date: entry.date, count: 1 }] : []
    else if (pathname === '/notes/boards') data = [{ id: 'board-1', name: 'Board', createdAt: `${date}T08:00:00Z`, updatedAt: `${date}T08:00:00Z`, pages: [entry] }]
    else if (pathname === '/assets/presign') {
      assetType = request.postDataJSON().assetType
      data = { asset: { id: assetId, assetType, status: 'pending-upload' }, uploadUrl: 'https://proof.test/upload', method: 'PUT' }
    } else if (pathname === '/assets/finalize') data = { id: assetId, assetType, status: 'ready' }
    else if (request.method() === 'PATCH' || (pathname === '/journal' && request.method() === 'POST')) {
      const patch = request.postDataJSON()
      patches.push(patch)
      if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, errors: [{ code: 'UNAVAILABLE', message: 'Save failed' }] }) })
      entry = { ...entry, ...patch, id: entry?.id ?? 'entry-1', createdAt: `${date}T08:00:00Z`, updatedAt: `${date}T09:00:00Z`, content: patch.content.replace(/src="[^"]*"/g, 'src="https://proof.test/image.png"') }
      data = entry
    } else if (pathname === '/journal/entry-1' || pathname === '/notes/pages/entry-1') data = entry
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, errors: [] }) })
  })
  return { patches, setFailure: value => { fail = value }, empty: () => { entry = null }, entry: () => entry, assetType: () => assetType }
}

for (const feature of ['journal', 'notes']) {
  test(`${feature}: resize/alignment survive auto-save and reopen; image is a separate block`, async ({ page }, testInfo) => {
    const api = await setupApi(page, feature)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/${feature}`)
    if (feature === 'journal') await page.getByRole('button', { name: 'Open journal Daily journal' }).click()
    const editor = page.getByRole('textbox', { name: 'Journal rich text editor' })
    const image = editor.locator('img')
    await expect(image).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Save|Retry save)$/ })).toHaveCount(0)
    await expect(editor.locator('p').last()).toHaveText('After image')
    await image.click()
    await expect(page.getByRole('button', { name: 'Justify', exact: true })).toBeDisabled()
    const handle = page.getByRole('button', { name: 'Resize image' })
    const bounds = await handle.boundingBox()
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 - 100, bounds.y + bounds.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect(image).toHaveAttribute('width', '200')
    await expect(image).toHaveAttribute('height', '200')
    await page.getByRole('button', { name: 'Align right', exact: true }).click()
    await expect(image).toHaveAttribute('width', '200')
    await page.getByRole('button', { name: 'Align center', exact: true }).click()
    await expect(image).toHaveAttribute('data-image-align', 'center')
    await expect(page.getByTestId(feature === 'journal' ? 'journal-save-status' : 'note-save-status')).toHaveText('Saved', { timeout: 7000 })
    expect(api.patches.at(-1).content).toContain('width="200"')
    expect(api.patches.at(-1).content).toContain('data-image-align="center"')
    await page.reload()
    if (feature === 'journal') await page.getByRole('button', { name: 'Open journal Daily journal' }).click()
    await expect(image).toHaveAttribute('width', '200')
    await expect(image).toHaveAttribute('data-image-align', 'center')
    const frame = await editor.locator('[data-image-block]').boundingBox()
    const actual = await image.boundingBox()
    expect(Math.abs((actual.x + actual.width / 2) - (frame.x + frame.width / 2))).toBeLessThan(2)
    await page.setViewportSize({ width: 768, height: 900 })
    await expect(image).toBeVisible()
    const tabletFrame = await editor.locator('[data-image-block]').boundingBox()
    const tabletImage = await image.boundingBox()
    expect(tabletImage.width).toBeLessThanOrEqual(tabletFrame.width + 1)
    await page.screenshot({ path: testInfo.outputPath(`${feature}-block-image.png`), fullPage: true })
  })
}

test('new Journal auto-saves, upload uses journal-image, and failed save warns before changing route', async ({ page }) => {
  const api = await setupApi(page, 'journal', '')
  api.empty()
  await page.goto('/journal')
  await page.getByTestId('create-journal-button').click()
  await page.getByLabel('Journal title', { exact: true }).fill('New daily journal')
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved', { timeout: 7000 })
  expect(api.patches.at(-1).title).toBe('New daily journal')
  await page.locator('input[type=file]').setInputFiles({ name: 'journal.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('textbox', { name: 'Journal rich text editor' }).locator('img')).toBeVisible()
  await expect(page.getByTestId('journal-save-status')).toHaveText('Saved', { timeout: 7000 })
  expect(api.assetType()).toBe('journal-image')
  expect(api.patches.at(-1).content).toContain(`data-asset-id="${assetId}"`)
  api.setFailure(true)
  await page.getByLabel('Journal title', { exact: true }).fill('Unsaved journal')
  await expect(page.getByTestId('journal-save-status')).toContainText('Save failed', { timeout: 7000 })
  await page.getByLabel('Primary navigation').getByRole('link', { name: 'Notes', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('may be lost')
  await page.getByRole('button', { name: 'Stay', exact: true }).click()
  await expect(page).toHaveURL(/\/journal$/)
  await expect(page.getByLabel('Journal title', { exact: true })).toHaveValue('Unsaved journal')
  await page.getByLabel('Primary navigation').getByRole('link', { name: 'Notes', exact: true }).click()
  await page.getByRole('button', { name: 'Discard and continue' }).click()
  await expect(page).toHaveURL(/\/notes$/)
})
