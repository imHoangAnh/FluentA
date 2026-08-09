import { expect, test } from '@playwright/test';

test('email registration keeps OTP server-side and blocks an unverified login', async ({ page }) => {
  const email = `verify-${crypto.randomUUID()}@fluenta.local`;
  const password = 'SecurePass123';

  await page.route('**/api/v1/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          message: 'Verification email sent. Check your inbox.',
          email,
          verificationExpiresAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          resendAvailableAtUtc: new Date(Date.now() + 60 * 1000).toISOString(),
        },
      }),
    });
  });
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before logging in.' } }),
    });
  });

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Verification Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  expect(registerPayload.data).not.toHaveProperty('developmentOtp');
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect(page.getByText('Enter the six-digit code we sent to your email')).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Please verify your email before logging in.')).toBeVisible();
});
