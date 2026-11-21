import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke tests against a real deployment with a dedicated TEST account.
 * Set E2E_EMAIL and E2E_PASSWORD (never commit them). These tests only read,
 * except for opening screens; they do not play games or post anything.
 */
const email = process.env.E2E_EMAIL ?? '';
const password = process.env.E2E_PASSWORD ?? '';

async function signIn(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: 'I already have an account' });
  if (await welcome.isVisible().catch(() => false)) {
    await welcome.click();
    await page.getByRole('tab', { name: 'Password', exact: true }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('tab', { name: 'Home', exact: true })).toBeVisible({ timeout: 30_000 });
}

test.describe('@live real backend', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD for a test account');

  test('signs in and loads every tab', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText('From people you follow')).toBeVisible();
    for (const [tab, text] of [
      ['Explore', 'Your reader profile'],
      ['Play', 'New games in'],
      ['Me', 'Corner'],
    ] as const) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('today’s four games are published', async ({ page }) => {
    await signIn(page);
    await page.getByRole('tab', { name: 'Play', exact: true }).click();
    for (const name of ['Hangman', 'Hidden cover', 'Clues', 'Timeline']) await expect(page.getByText(name).first()).toBeVisible();
  });

  test('search finds a catalogue book', async ({ page }) => {
    await signIn(page);
    await page.goto('/search');
    await page.getByLabel('Search books').fill('Dune');
    await expect(page.getByText('Frank Herbert').first()).toBeVisible({ timeout: 20_000 });
  });

  test('communities and market load', async ({ page }) => {
    await signIn(page);
    await page.getByRole('tab', { name: 'Explore', exact: true }).click();
    await page.getByRole('tab', { name: 'Communities', exact: true }).click();
    await expect(page.getByText(/Do you run a book club\?|members/).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Market', exact: true }).click();
    await expect(page.getByText(/Sell or swap|readers? want/).first()).toBeVisible();
  });
});
