import { expect, test } from '@playwright/test';

import en from '../src/i18n/en';
import { QUIZ } from '../src/utils/sorting-quiz';
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
    // Twelve questions; the answers carry no letters or Houses. Pick the most Weaver-like each time.
    const shots = process.env.E2E_SHOTS;
    if (shots) await page.screenshot({ path: `${shots}/q-intro.png` });
    for (const [i, q] of QUIZ.entries()) {
      await expect(page.getByText(q.title, { exact: true })).toBeVisible();
      if (shots && i === 5) await page.screenshot({ path: `${shots}/q-6.png` });
      await expect(page.getByText(`Question ${i + 1} of 12`, { exact: false })).toBeVisible();
      const pick = [...q.options].sort((a, b) => b.v[1] - a.v[1])[0];
      await page.getByRole('radio', { name: pick.text }).click();
    }
    // Review: every answer is listed and can be changed before the reveal.
    await expect(page.getByText(en.sorting.review.title)).toBeVisible();
    await page.getByRole('button', { name: 'Change answer to question 3' }).click();
    await expect(page.getByText(QUIZ[2].title, { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: QUIZ[2].options.find((o) => o.v[1] === 20)!.text }).click();
    await expect(page.getByText(en.sorting.review.title)).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/q-review.png` });
    await page.getByRole('button', { name: en.sorting.review.cta }).click();

    await expect(page.getByRole('heading', { name: 'Weavers' })).toBeVisible();
    await expect(page.getByText(en.houses.weavers.motto, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(en.houses.weavers.description).first()).toBeVisible();
    // All four percentages are shown, never raw points.
    for (const p of ['75%', '12%', '9%', '4%']) await expect(page.getByText(p, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('215')).toHaveCount(0);
    if (shots) await page.screenshot({ path: `${shots}/q-reveal.png`, fullPage: true });
    await page.getByRole('button', { name: en.common.continue }).click();
    await expect(page.getByText(en.onboarding.notify.title)).toBeVisible();
  });
});
