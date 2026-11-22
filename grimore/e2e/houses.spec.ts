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
    await expect(page.getByRole('link', { name: `${en.house.title}: Lantern` })).toBeVisible();
    await expect(page.getByRole('img', { name: en.marks['badge-founding'] })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-me.png` });
  });

  test('my House page explains the sorting and the ritual', async ({ page }) => {
    await page.goto('/house');
    await expect(page.getByText('Wayfinders').first()).toBeVisible();
    await expect(page.getByText(en.houses.lantern.ritual).first()).toBeVisible();
    await expect(page.getByText(/63 % Lantern/).first()).toBeVisible();
    await expect(page.getByRole('switch', { name: en.house.hide }).or(page.getByLabel(en.house.hide)).first()).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-house.png`, fullPage: true });
  });

  test('House Cup ranks by points per member and shows the duels', async ({ page }) => {
    await page.goto('/house-cup');
    await expect(page.getByText(en.cup.fairness)).toBeVisible();
    await expect(page.getByRole('button', { name: /^1\. Thorn/ })).toBeVisible();
    await expect(page.getByText(/Lantern 58 %/)).toBeVisible();
    await expect(page.getByText(/246 points for Lantern/)).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-cup.png`, fullPage: true });
  });

  test('Common Room has the quest and opt-in contributors', async ({ page }) => {
    await page.goto('/common-room/lantern');
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
    await expect(page.getByText('Thorn collection')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-shop.png`, fullPage: true });
  });

  test('Play shows the House Cup', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: en.cup.open })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/h-play.png` });
  });
});
