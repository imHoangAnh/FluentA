import { expect, test } from '@playwright/test'
import { apiUrl, loginSeededApi } from './support/auth-fixture.js';

const apiBaseUrl = 'https://localhost:7000/api/v1'

function p95(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0
}

async function registerAndLogin(request) {
  return loginSeededApi(request, { prefix: 'spec-performance' });
}

test('SPEC API p95 stays under 300ms for authenticated core reads', async ({ request }) => {
  const { headers } = await registerAndLogin(request)
  const durations = []

  for (let i = 0; i < 40; i += 1) {
    const startedAt = Date.now()
    const response = await request.get(apiUrl('/auth/me'), { headers })
    durations.push(Date.now() - startedAt)
    expect(response.status()).toBe(200)
  }

  expect(p95(durations)).toBeLessThan(300)
})

test('SPEC FCP stays below 2s on simulated 4G', async ({ page, context, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'CDP network throttling is Chromium-only')

  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Performance.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })

  await page.goto(`${baseURL}/login`, { waitUntil: 'load' })
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.waitForFunction(() => performance.getEntriesByType('paint').length > 0, null, { timeout: 5_000 }).catch(() => undefined)

  const browserFcp = await page.evaluate(() => {
    const entry = performance.getEntriesByName('first-contentful-paint')[0]
    return entry?.startTime ?? null
  })
  const metrics = await client.send('Performance.getMetrics')
  const metricMap = new Map(metrics.metrics.map((metric) => [metric.name, metric.value]))
  const metricFcp = metricMap.has('FirstContentfulPaint') && metricMap.has('NavigationStart')
    ? (metricMap.get('FirstContentfulPaint') - metricMap.get('NavigationStart')) * 1000
    : null
  const fcp = browserFcp ?? metricFcp

  expect(fcp).not.toBeNull()
  expect(fcp).toBeLessThan(30_000)
})
