import { expect, test } from '@playwright/test';

test('email registration requires verification before password login', async ({ page }) => {
  const email = `verify+${crypto.randomUUID()}@example.com`;
  const password = 'SecurePass123';

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Verification Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect(page.getByText('Enter the six-digit code we sent to your email')).toBeVisible();

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Please verify your email before logging in.')).toBeVisible();

  await page.goto(`http://127.0.0.1:5173/verify-email?email=${encodeURIComponent(email)}`);
  await page.getByLabel('Verification code').fill(registerPayload.data.developmentOtp);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await expect(page.getByText('Email verified. You can log in now.')).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
});
