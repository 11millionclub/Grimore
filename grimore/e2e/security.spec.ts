import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

/** The team's kill switch shows a maintenance screen to everyone. */
test.describe('@mock kill switch', () => {
  test('maintenance on shows the maintenance screen', async ({ page }) => {
    await useMockBackend(page);
    await page.route(/rest\/v1\/app_config/, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: { on: true, message: 'Back at 18:00.' } }) }),
    );
    await page.goto('/');
    await expect(page.getByText('Back soon')).toBeVisible();
    await expect(page.getByText('Back at 18:00.')).toBeVisible();
  });

  test('maintenance off (or no config table) keeps the app running', async ({ page }) => {
    await useMockBackend(page);
    await page.route(/rest\/v1\/app_config/, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"42P01"}' }));
    await page.goto('/');
    await expect(page.getByText('From people you follow')).toBeVisible();
  });
});
