import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

const SHOTS = process.env.SHOTS;

/** The House shows on reader profiles, and stays private when hidden. */
test.describe('@mock House on profiles', () => {
  test('my profile shows my House', async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/me');
    await expect(page.getByText('One of the Wanderers')).toBeVisible();
    await expect(page.getByText('We wander where wonder leads.')).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/me-house.png` });
  });

  test("another reader's profile shows their House", async ({ page }) => {
    await useMockBackend(page);
    await page.goto('/user/ines.reads');
    await expect(page.getByText('One of the Weavers')).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/user-house.png` });
  });

  test('a hidden House is marked as private on my own profile', async ({ page }) => {
    await useMockBackend(page);
    await page.route(/rpc\/my_house/, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ house_id: 'luminaries', house_hidden: true, house_assigned_at: '2026-10-01T00:00:00Z' }]) }),
    );
    await page.goto('/me');
    await expect(page.getByText('One of the Luminaries')).toBeVisible();
    await expect(page.getByText('Only you can see your House')).toBeVisible();
  });

  test('no House, no plate', async ({ page }) => {
    await useMockBackend(page);
    await page.route(/rpc\/reader_houses/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/user/ines.reads');
    await expect(page.getByText('Inês Costa').first()).toBeVisible();
    await expect(page.getByText(/of House/)).toHaveCount(0);
  });
});
