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

  test('a book page still opens when a related table fails', async ({ page }) => {
    await page.route(/rest\/v1\/(book_authors|book_genres)/, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"XX000","message":"boom"}' }));
    await page.goto('/book/b2');
    await expect(page.getByText('Mrs Dalloway').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('an unknown book says so and shows the error code', async ({ page }) => {
    await page.goto('/book/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('That book is not in the catalogue yet.')).toBeVisible();
    await expect(page.getByText('Error code: book_not_found')).toBeVisible();
  });
});
