import { expect, test } from '@playwright/test';

test('Chinese board adapts vocabulary and review labels to Pinyin', async ({ page }) => {
  const email = `multilang+${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Full name').fill('Multilingual Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  const registerResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const registerPayload = await (await registerResponsePromise).json();
  await page.request.post('http://127.0.0.1:5000/api/v1/auth/verify-email', {
    data: { email, otp: registerPayload.data.developmentOtp },
  });
  await page.goto('http://127.0.0.1:5173/login');
  await expect(page).toHaveURL('http://127.0.0.1:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SecurePass123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/vocabulary');
  await page.getByRole('button', { name: 'Create board' }).click();

  await page.getByTestId('board-name-input').fill('HSK Board');
  await page.getByTestId('board-language-select').click();
  await page.getByRole('option', { name: 'Chinese', exact: true }).click();
  await page.getByTestId('create-board-button').click();
  await page.getByTestId('page-name-input').fill('Lesson One');
  await page.getByTestId('create-page-button').click();

  await page.getByLabel('New word', { exact: true }).fill('你好');
  await page.getByLabel('New Vietnamese meaning').fill('xin chào');
  await page.getByLabel('New Pinyin').fill('ni hao');
  await page.getByLabel('New word class').click();
  await page.getByRole('option', { name: 'Phrase', exact: true }).click();
  await page.getByLabel('New example').fill('你好！');
  await page.getByTestId('create-word-button').click();
  await expect(page.getByLabel('Pinyin for 你好')).toHaveValue('ni hao');

  await page.getByTestId('open-flashcards').click();
  await expect(page.getByText('Pinyin').first()).toBeVisible();
  await page.getByRole('link', { name: 'Study this Page Deck' }).click();
  await page.getByTestId('start-review-session').click();
  await page.getByTestId('show-answer').click();
  await expect(page.getByTestId('review-answer').getByText('Pinyin')).toBeVisible();
  await expect(page.getByText('ni hao')).toBeVisible();
});
