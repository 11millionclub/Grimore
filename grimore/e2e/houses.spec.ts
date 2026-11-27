import { expect, test } from '@playwright/test';

import en from '../src/i18n/en';
import { useMockBackend } from './fixtures';

const shots = process.env.E2E_SHOTS;

test.describe('@mock Houses', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('profile shows the House badge and founding mark', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByRole('link', { name: 'One of the Wanderers' })).toBeVisible();
    await expect(page.getByRole('img', { name: en.marks['badge-founding'] })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-me.png` });
  });

  test('my House page explains the sorting and the ritual', async ({ page }) => {
    await page.goto('/house');
    await expect(page.getByText('Wanderers').first()).toBeVisible();
    await expect(page.getByText(en.houses.wanderers.ritual).first()).toBeVisible();
    await expect(page.getByText('63%').first()).toBeVisible();
    await expect(page.getByRole('switch', { name: en.house.hide }).or(page.getByLabel(en.house.hide)).first()).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-house.png`, fullPage: true });
  });

  test('House Cup ranks by points per member and shows the duels', async ({ page }) => {
    await page.goto('/house-cup');
    await expect(page.getByText(en.cup.fairness)).toBeVisible();
    await expect(page.getByRole('button', { name: /^1\. Weavers/ })).toBeVisible();
    await expect(page.getByText(/Wanderers 58 · Weavers 42 per active member this week/)).toBeVisible();
    await expect(page.getByText(/246 points for Wanderers/)).toBeVisible();
    // "N active" lists the House members who earned points this season.
    await page.getByRole('link', { name: /active, Wanderers$/ }).click();
    await expect(page.getByText('Active in Wanderers').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Test Reader, 246 points' })).toBeVisible();
    await expect(page.getByText('1 more keep their House private.')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-cup.png`, fullPage: true });
  });

  test('Common Room has the quest and opt-in contributors', async ({ page }) => {
    await page.goto('/common-room/wanderers');
    await expect(page.getByText(en.room.quest)).toBeVisible();
    await expect(page.getByText(en.room.topHint)).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-room.png`, fullPage: true });
  });

  test('Corner editor has a House tab with starter, earned and collection', async ({ page }) => {
    await page.goto('/corner/edit');
    await page.getByText(en.shop.houseTab, { exact: true }).click();
    await expect(page.getByText(en.shop.starter)).toBeVisible();
    await expect(page.getByText(en.shop.earnedHint)).toBeVisible();
    await expect(page.getByText(en.shop.collection)).toBeVisible();
    await expect(page.getByText('Weavers collection')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-shop.png`, fullPage: true });
  });

  test('Play shows the House Cup', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: en.cup.open })).toBeVisible();
    await expect(page.getByRole('button', { name: /My points: 740/ })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-play.png` });
  });

  test('points wallet lists rewards, past codes and redeems without touching the Cup', async ({ page }) => {
    page.on('dialog', (d) => void d.accept());
    await page.goto('/points');
    await expect(page.getByText('740', { exact: true })).toBeVisible();
    await expect(page.getByText('10% off in the shop').first()).toBeVisible();
    await expect(page.getByText(/GRIM-AB12CD34/)).toBeVisible();
    await expect(page.getByText(/never your House/)).toBeVisible();
    const rows = page.getByRole('button', { name: 'Redeem' });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toBeDisabled();
    const req = page.waitForRequest((r) => r.url().includes('rpc/redeem_reward'));
    await rows.nth(2).click();
    await req;
    if (shots) await page.screenshot({ path: `${shots}/h-points.png`, fullPage: true });
  });
});
