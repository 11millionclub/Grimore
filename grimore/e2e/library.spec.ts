import { expect, test } from '@playwright/test';

import { useMockBackend, writes } from './fixtures';

/** Library writes against the stateful mock, which applies the database's date rules. */
test.describe('@mock library', () => {
  test.beforeEach(async ({ page }) => {
    await useMockBackend(page);
  });

  test('reading a finished book again starts a fresh read', async ({ page }) => {
    await page.goto('/book/b3');
    await page.getByRole('button', { name: 'Read it again' }).click();
    await expect(page.getByText('is now in Reading')).toBeVisible();
    expect(writes.at(-1)?.body).toMatchObject({ status: 'reading', finished_on: null, current_page: 0 });
  });

  test('every reading status can be picked from the shelf panel', async ({ page }) => {
    await page.goto('/book/b4');
    for (const s of ['Reading', 'Read', 'On hold', 'Abandoned', 'Want to read']) {
      await page.getByRole('button', { name: /^Shelf: / }).click();
      await page.getByRole('button', { name: s, exact: true }).click();
      await expect(page.getByText(`Moved to ${s}`).last()).toBeVisible();
    }
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('logging pages saves progress', async ({ page }) => {
    await page.goto('/book/b1');
    await page.getByRole('button', { name: 'Update page' }).click();
    await page.getByText('+25', { exact: true }).click();
    await page.getByRole('button', { name: 'Save +25 pages' }).click();
    await expect(page.getByText('+25 pages today')).toBeVisible();
    expect(writes.at(-1)).toMatchObject({ path: 'rpc/log_progress', body: { p_book: 'b1', p_page: 159 } });
  });
});
