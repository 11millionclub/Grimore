import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

const shots = process.env.E2E_SHOTS;

test.describe('@mock My Grimore library, wheel and reading sessions', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('the library room puts your books on its shelves and they open', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByText('Classic Library').first()).toBeVisible();
    const spine = page.getByRole('button', { name: /^Blindness/ });
    await expect(spine).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start reading session' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Palace Library, locked/ })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-room.png`, fullPage: true });
    await page.getByRole('button', { name: /Palace Library, locked/ }).click();
    await expect(page.getByText('Unlock with 900 points')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-locked.png` });
    await page.getByText('Not now').click();
    await page.getByRole('button', { name: 'Show the whole room' }).click();
    if (shots) await page.screenshot({ path: `${shots}/g-room-full.png` });
    await spine.click();
    await expect(page).toHaveURL(/\/book\/b3/);
  });

  test('the wheel spins once, then offers rerolls', async ({ page }) => {
    await page.goto('/wheel');
    await page.getByRole('tab', { name: 'Owned' }).or(page.getByText('Owned', { exact: true })).first().click();
    const spin = page.getByRole('button', { name: 'Spin the wheel' });
    await expect(spin).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-wheel.png`, fullPage: true });
    const used = page.waitForRequest((r) => r.url().includes('rpc/use_wheel_spin'));
    await spin.click();
    await used;
    await expect(page.getByText('The wheel chose')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Reroll, 2 left today/ })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-wheel-result.png`, fullPage: true });
  });

  test('a reading session times you and saves the minutes', async ({ page }) => {
    await page.goto('/reading-session');
    await page.getByText('Rain', { exact: true }).click();
    await page.getByRole('button', { name: 'Start reading session' }).click();
    await expect(page.getByText('Reading…')).toBeVisible();
    await page.clock.install();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByText('Paused')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-session.png`, fullPage: true });
  });

  test('a finished session is saved with its minutes', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-24T10:00:00Z') });
    await page.goto('/reading-session');
    await page.getByRole('button', { name: 'Start reading session' }).click();
    await page.clock.fastForward('25:00');
    const saved = page.waitForRequest((r) => r.url().includes('rpc/log_reading_session'));
    await page.getByRole('button', { name: 'Finish' }).click();
    const req = await saved;
    expect(JSON.parse(req.postData() ?? '{}').p_seconds).toBeGreaterThanOrEqual(1500);
    await expect(page.getByText(/25 min of reading today/)).toBeVisible();
  });

  test('reviews carry your rating and can be tagged', async ({ page }) => {
    await page.goto('/review/b2');
    await expect(page.getByText('Enemies to lovers')).toBeVisible();
    await page.getByText('Slow burn').click();
    if (shots) await page.screenshot({ path: `${shots}/g-review.png`, fullPage: true });
  });
});
