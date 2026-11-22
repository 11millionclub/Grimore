import { expect, test } from '@playwright/test';

import en from '../src/i18n/en';
import { useMockBackend } from './fixtures';

/** A new reader goes from date of birth to the House reveal. */
test.describe('@mock onboarding and the Sorting', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('new reader is sorted into a House', async ({ page }) => {
    await useMockBackend(page, { newReader: true });
    await page.goto('/');

    await expect(page.getByText(en.onboarding.dob.title)).toBeVisible();
    await page.getByLabel(en.onboarding.dob.day).fill('05');
    await page.getByLabel(en.onboarding.dob.month).fill('05');
    await page.getByLabel(en.onboarding.dob.year).fill('1995');
    await page.getByRole('button', { name: en.common.continue }).click();

    await expect(page.getByText(en.onboarding.languages.title)).toBeVisible();
    await page.getByRole('button', { name: en.common.continue }).click();
    await expect(page.getByText(en.onboarding.formats.title)).toBeVisible();
    await page.getByRole('checkbox', { name: en.onboarding.formats.print }).click();
    await page.getByRole('button', { name: en.common.continue }).click();

    await expect(page.getByText(en.onboarding.genres.title)).toBeVisible();
    for (const g of ['Literary Fiction', 'Fantasy', 'Romance']) await page.getByRole('checkbox', { name: g }).click();
    await page.getByRole('button', { name: en.common.continue }).click();

    await expect(page.getByText(en.onboarding.import.title)).toBeVisible();
    await page.getByRole('button', { name: en.onboarding.import.later }).click();
    await expect(page.getByText(en.onboarding.top4.title)).toBeVisible();
    await page.getByRole('button', { name: en.common.skip }).last().click();
    await expect(page.getByText(en.onboarding.intents.title)).toBeVisible();
    await page.getByRole('button', { name: en.common.continue }).click();
    await expect(page.getByText(en.onboarding.goal.title)).toBeVisible();
    await page.getByRole('button', { name: /Set a goal of/ }).click();
    await expect(page.getByText(en.onboarding.warnings.title)).toBeVisible();
    await page.getByRole('button', { name: en.common.continue }).click();

    await expect(page.getByText(en.sorting.intro.title)).toBeVisible();
    await page.getByRole('button', { name: en.sorting.intro.begin }).click();
    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const) {
      await expect(page.getByText(en.sorting[q].title)).toBeVisible();
      await page.getByRole('radio', { name: en.sorting[q].thorn }).click();
    }

    await expect(page.getByRole('heading', { name: 'Thorn' })).toBeVisible();
    await expect(page.getByText(en.houses.thorn.motto, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/88 % Thorn/).first()).toBeVisible();
    await page.getByRole('button', { name: en.common.continue }).click();
    await expect(page.getByText(en.onboarding.notify.title)).toBeVisible();
  });
});
