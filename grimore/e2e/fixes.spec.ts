import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

test.describe('@mock reports, shelves, socials, wrapped', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test("someone else's comment can be reported as a spoiler and is hidden", async ({ page }) => {
    await page.goto('/post/r1?type=review');
    await expect(page.getByText(/ruined me/)).toBeVisible();
    await page.getByRole('button', { name: 'More options: report' }).last().click();
    await page.getByRole('button', { name: /Spoiler/ }).click();
    await expect(page.getByText('You reported this. It is hidden for you while we review it.')).toBeVisible();
  });

  test('a book can be taken off a custom shelf', async ({ page }) => {
    await page.goto('/shelf/rl1?name=Summer%20reads');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: /^Remove / }).first().click();
    await expect(page.getByText('Removed from this shelf')).toBeVisible();
  });

  test('profile shows social handles', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByRole('link', { name: 'Instagram: @test.reader' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Goodreads: @testreader' })).toBeVisible();
  });

  for (const vp of [
    { width: 320, height: 640 },
    { width: 1280, height: 800 },
  ]) {
    test(`Wrapped fits a ${vp.width}px screen`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/wrapped');
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
