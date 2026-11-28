import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

test.describe('@mock discovery, data, progress', () => {
  test('find books by mood and trope', async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/discover');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Found family', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Blindness, José Saramago/ })).toBeVisible();
    await expect(page.getByText('Clear filters (2)')).toBeVisible();
  });

  test('settings has export and delete in one place', async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/settings');
    await expect(page.getByText('Your data and account', { exact: false })).toBeVisible();
    await expect(page.getByText('Export my data')).toBeVisible();
    await expect(page.getByText('Delete account')).toBeVisible();
  });

  test('ebooks log progress in percent', async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/progress/b1');
    await page.getByText('Ebook', { exact: true }).click();
    await page.getByText('+25%', { exact: true }).click();
    await expect(page.getByText('of the ebook')).toBeVisible();
    const sent = page.waitForRequest((r) => r.url().includes('rpc/log_progress_percent'));
    await page.getByRole('button', { name: /^Save \+/ }).click();
    expect((await sent).postDataJSON()).toMatchObject({ p_book: 'b1' });
  });

  test('notifications can be filtered', async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Followers', exact: true }).click();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });
});
