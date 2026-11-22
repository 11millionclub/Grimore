import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

/** UI flows against fixture data: fast, offline, safe to run anywhere. */
test.describe('@mock signed-in app', () => {
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('home shows reading, goal, streak and the feed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grimore').first()).toBeVisible();
    await expect(page.getByText('One Hundred Years of Solitude').first()).toBeVisible();
    await expect(page.getByText('6 days')).toBeVisible();
    await expect(page.getByText('From people you follow')).toBeVisible();
    await expect(page.getByText('A parable that refuses to look away')).toBeVisible();
  });

  test('tab bar navigates between the main sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Explore', exact: true }).click();
    await expect(page.getByText('Communities for you')).toBeVisible();
    await page.getByRole('tab', { name: 'Play', exact: true }).click();
    await expect(page.getByText('Hidden cover')).toBeVisible();
    await page.getByRole('tab', { name: 'Me', exact: true }).click();
    await expect(page.getByText('Test Reader').first()).toBeVisible();
  });

  test('the + button opens the log sheet', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Inscribe: add a book' }).click();
    await expect(page.getByText('Photograph your shelf')).toBeVisible();
    await expect(page.getByText('Scan a barcode')).toBeVisible();
  });

  test('explore switches to communities and the market', async ({ page }) => {
    await page.goto('/explore');
    await page.getByRole('tab', { name: 'Communities', exact: true }).click();
    await expect(page.getByText('Night Readers')).toBeVisible();
    await page.getByRole('tab', { name: 'Market', exact: true }).click();
    await expect(page.getByText('€9')).toBeVisible();
  });

  test('a daily game shows its rules before the clock starts', async ({ page }) => {
    await page.goto('/game/g1');
    await expect(page.getByText('Hangman').first()).toBeVisible();
    await expect(page.getByText('The clock starts when the countdown ends.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  test('book page shows actions and details', async ({ page }) => {
    await page.goto('/book/b3');
    await expect(page.getByText('Blindness').first()).toBeVisible();
    await expect(page.getByText('Your rating')).toBeVisible();
    await expect(page.getByText('Write a review')).toBeVisible();
  });

  test('corner editor marks paid items and keeps payments off', async ({ page }) => {
    await page.goto('/corner/edit');
    await expect(page.getByText('Your Corner')).toBeVisible();
    await page.getByText('Holographic').click();
    await expect(page.getByText(/Holographic · €1\.99/)).toBeVisible();
    await page.getByText(/Holographic · €1\.99/).click();
    await expect(page.getByText('Coming soon')).toBeVisible();
  });

  test('import offers Kindle and Kobo alongside the CSV exports', async ({ page }) => {
    await page.goto('/import');
    await expect(page.getByText('Kindle highlights')).toBeVisible();
    await expect(page.getByText('Kobo library')).toBeVisible();
    await expect(page.getByText('Import from Goodreads')).toBeVisible();
  });

  test('screenshots of the main screens', async ({ page }, info) => {
    for (const path of ['/', '/explore', '/play', '/me', '/book/b3', '/community/cm1', '/listing/l1']) {
      await page.goto(path);
      await page.waitForTimeout(1500);
      await info.attach(path === '/' ? 'home' : path.slice(1).replace(/\//g, '-'), { body: await page.screenshot(), contentType: 'image/png' });
    }
  });
});

test.describe('@mock signed out', () => {
  test('welcome and sign-in screens', async ({ page }) => {
    await page.route(/\.supabase\.co\//, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto('/');
    await expect(page.getByText('Everything you read,')).toBeVisible();
    await page.getByRole('button', { name: 'I already have an account' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeDisabled();
  });
});
