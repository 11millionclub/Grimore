import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

/** Reviews outside communities, invites. */
test.describe('@mock reviews and invites', () => {
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('the home feed asks for reviews only', async ({ page }) => {
    const feedQuery = page.waitForRequest((r) => r.url().includes('/rest/v1/feed_items'));
    await page.goto('/');
    expect(decodeURIComponent((await feedQuery).url())).toContain('item_type=eq.review');
  });

  test('Inscribe offers a review, not a post', async ({ page }) => {
    await page.goto('/add');
    await expect(page.getByText('Write a review')).toBeVisible();
    await expect(page.getByText('Write a post')).toHaveCount(0);
  });

  test('my profile tab is called Reviews', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByRole('tab', { name: 'Reviews' })).toBeVisible();
  });

  test('invite screen shows my code and lets me enter a friend’s', async ({ page }) => {
    await page.goto('/invite');
    await expect(page.getByText('ABCD2345', { exact: true })).toBeVisible();
    await page.getByLabel("Friend's invite code").fill('wxyz9876');
    await page.getByRole('button', { name: 'Use code' }).click();
    await expect(page.getByText('Welcome gift: +50 points')).toBeVisible();
  });
});
