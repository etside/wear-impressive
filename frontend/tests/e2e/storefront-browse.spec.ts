import { test, expect } from '@playwright/test';
import { seedStoreHandle } from './helpers/auth';

test.describe('Storefront browsing', () => {
  test.beforeEach(async ({ context }) => {
    await seedStoreHandle(context);
  });

  test('home page renders without error', async ({ page }) => {
    await page.goto('/store');

    // The theme Hero renders the store name. We don't know the exact name,
    // but the header / body should at least contain text (not be blank /
    // an error page).
    await expect(page.locator('body')).not.toBeEmpty();

    // Either "Shop Now" CTA or a category heading — this proves the store
    // info + categories query returned without throwing.
    const catsHeading = page.getByRole('heading', { name: /categor/i });
    const shopNowBtn = page.getByRole('link', { name: /shop now/i });
    await expect(catsHeading.first().or(shopNowBtn.first()).first()).toBeVisible({ timeout: 15_000 });
  });

  test('search page handles empty query and unlikely query gracefully', async ({ page }) => {
    await page.goto('/store/search');
    await expect(page.getByRole('heading', { name: /search/i }).first()).toBeVisible();

    // Type a nonsense query — should show "No products found".
    const input = page.getByPlaceholder(/search for products/i);
    await input.fill('xyz-definitely-not-a-real-product-query-12345');

    // Debounced 300ms.
    await expect(page.getByText(/no products found/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('about page renders store name', async ({ page }) => {
    await page.goto('/store/about');
    await expect(page.getByRole('heading', { name: /about /i }).first()).toBeVisible();
  });

  test('contact page renders store contact info placeholders', async ({ page }) => {
    await page.goto('/store/contact');
    // Contact labels are always rendered (Address/Phone/Email/Business Hours).
    await expect(page.getByText('Address', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Email', { exact: true }).first()).toBeVisible();
  });
});
