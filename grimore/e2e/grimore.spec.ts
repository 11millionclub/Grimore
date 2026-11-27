import { expect, test } from '@playwright/test';

import { useMockBackend } from './fixtures';

const shots = process.env.E2E_SHOTS;

test.describe('@mock My Grimore library, wheel and reading sessions', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('the Grimore tab is the library: books on the shelves, a caption on hold, rooms behind the name', async ({ page }) => {
    await page.goto('/grimore');
    const spine = page.getByRole('button', { name: /^Blindness/ });
    await expect(spine).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start reading session' })).toBeVisible();
    // Holding (hovering on the web) a book shows its label.
    await spine.hover();
    await expect(page.getByText('José Saramago')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-room.png` });
    await page.mouse.move(5, 5);
    // The room name opens the room picker; with paywalls on, other rooms are locked.
    await page.getByRole('button', { name: /Classic Library\. Change library/ }).click();
    await page.getByRole('button', { name: /Palace Library, locked/ }).click();
    await expect(page.getByText('Unlock with 900 points')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-locked.png` });
    await page.getByText('Not now').click();
    await spine.click();
    await expect(page).toHaveURL(/\/book\/b3/);
  });

  test('your profile points to the library tab', async ({ page }) => {
    await page.goto('/me');
    await page.getByRole('button', { name: 'Open your library' }).click();
    await expect(page).toHaveURL(/\/grimore/);
  });

  test('the Houses tab gathers the Cup, your House and the common rooms', async ({ page }) => {
    await page.goto('/houses');
    await expect(page.getByRole('button', { name: /^1\. Weavers/ })).toBeVisible();
    await page.getByText('My House', { exact: true }).click();
    await expect(page.getByText('Wanderers').first()).toBeVisible();
    await page.getByText('Common rooms', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Wanderers common room, your House/ })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-houses.png` });
  });

  test('the wheel spins once, then offers to spin again', async ({ page }) => {
    await page.goto('/wheel');
    await page.getByRole('tab', { name: 'TBR' }).or(page.getByText('TBR', { exact: true })).first().click();
    const spin = page.getByRole('button', { name: 'Spin the wheel' });
    await expect(spin).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/g-wheel.png`, fullPage: true });
    const used = page.waitForRequest((r) => r.url().includes('rpc/use_wheel_spin'));
    await spin.click();
    await used;
    await expect(page.getByText('THE WHEEL HAS CHOSEN')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole('button', { name: 'Spin again' })).toBeVisible();
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

for (const vp of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]) {
  test.describe(`@mock fantasy library and wheel on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.beforeEach(async ({ page }) => {
      await useMockBackend(page, { covers: true });
    });

    test('the Grimore tab shows covers on the shelves and books on display', async ({ page }) => {
      await page.goto('/grimore');
      await expect(page.getByRole('button', { name: /on display/ }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^The Ashen Crown, The Ember Throne/ })).toBeVisible();
      if (shots) await page.screenshot({ path: `${shots}/v-${vp.name}-me.png`, fullPage: false });
      await page.getByRole('button', { name: /^The Ashen Crown/ }).hover();
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/v-${vp.name}-me-caption.png` });
      await page.getByRole('button', { name: /^The Ashen Crown/ }).click();
      await expect(page).toHaveURL(/\/book\/x0/);
    });

    test('the wheel is a full artefact and lands on an eligible book', async ({ page }) => {
      await page.goto('/wheel');
      await expect(page.getByText('Any spice')).toBeVisible();
      await expect(page.getByText('Any trope')).toBeVisible();
      if (shots) await page.screenshot({ path: `${shots}/v-${vp.name}-wheel.png` });
      await page.getByRole('button', { name: 'Spin the wheel' }).click();
      await expect(page.getByText('THE WHEEL HAS CHOSEN')).toBeVisible({ timeout: 12_000 });
      if (shots) await page.screenshot({ path: `${shots}/v-${vp.name}-wheel-result.png`, fullPage: true });
    });
  });
}
