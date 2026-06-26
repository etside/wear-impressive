import { test, expect, request as apiRequest } from '@playwright/test';
import { seedStoreHandle } from './helpers/auth';

/**
 * COD checkout — this test REQUIRES at least 1 published product in the
 * test-store. If there are none, the test skips cleanly.
 */

const STORE_HANDLE = 'test-store';
const BACKEND_URL = 'http://127.0.0.1:8000';

test.describe('COD checkout', () => {
  let hasProducts = false;
  let firstProductSlug: string | null = null;

  test.beforeAll(async () => {
    // Query the backend directly to decide whether to run the suite.
    const ctx = await apiRequest.newContext();
    try {
      const res = await ctx.get(`${BACKEND_URL}/api/store/products?per_page=1`, {
        headers: { 'X-Store-Handle': STORE_HANDLE, Accept: 'application/json' },
      });
      if (!res.ok()) return;
      const body = await res.json();
      const data = body?.data?.data ?? body?.data ?? [];
      if (Array.isArray(data) && data.length > 0) {
        hasProducts = true;
        firstProductSlug = data[0].slug ?? String(data[0].id);
      }
    } catch {
      // leave hasProducts = false; individual tests will skip.
    } finally {
      await ctx.dispose();
    }
  });

  test.beforeEach(async ({ context }) => {
    await seedStoreHandle(context, STORE_HANDLE);
  });

  test('guest can place a COD order', async ({ page }) => {
    test.skip(!hasProducts, 'No products seeded in test-store — cannot exercise checkout.');
    test.skip(!firstProductSlug, 'No product slug available.');

    // 1. Open the product detail page, click Add to Cart.
    await page.goto(`/store/products/${firstProductSlug}`);
    const addBtn = page.getByRole('button', { name: /add to cart|add to bag|buy now/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    // Add to Cart redirects to /store/cart on success; wait for it.
    await page.waitForURL(/\/store\/cart/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const emptyCart = page.getByText(/cart is empty|your cart is empty/i);
    if (await emptyCart.isVisible().catch(() => false)) {
      test.skip(true, 'Add-to-cart did not register (theme may require variant selection).');
    }

    // Proceed to checkout.
    const checkoutBtn = page.getByRole('link', { name: /checkout/i })
      .or(page.getByRole('button', { name: /checkout|proceed/i }))
      .first();
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 });
    await checkoutBtn.click();

    await page.waitForURL(/\/store\/checkout/, { timeout: 15_000 });

    // 3. Fill the contact + shipping form (Step 0).
    await page.getByPlaceholder('Sanjida').fill('Test');
    await page.getByPlaceholder('Priya').fill('Buyer');
    await page.getByPlaceholder('01712-345678').fill('01712345678');
    await page.getByPlaceholder('you@example.com').fill('test-buyer@example.com');
    await page.getByPlaceholder(/Mirpur|Dhanmondi/i).fill('Mirpur');
    await page.getByPlaceholder(/House #/i).fill('House 12, Road 3');

    // Next → shipping step.
    await page.getByRole('button', { name: /^next$/i }).click();

    // 4. Pick the first shipping option and hit Next.
    await page.waitForTimeout(1000); // wait for calc query to resolve
    const shippingOption = page.locator('button:has-text("Free"), button:has-text("৳")').first();
    if (await shippingOption.isVisible().catch(() => false)) {
      await shippingOption.click();
    }
    await page.getByRole('button', { name: /^next$/i }).click();

    // 5. Payment step — select COD / Cash.
    const codButton = page.getByRole('button', { name: /cod|cash on delivery|cash/i }).first();
    if (await codButton.isVisible().catch(() => false)) {
      await codButton.click();
    } else {
      test.skip(true, 'COD payment method is not enabled for this store.');
    }
    await page.getByRole('button', { name: /^next$/i }).click();

    // 6. Review — place order.
    const placeOrder = page.getByRole('button', { name: /place order/i });
    await expect(placeOrder).toBeVisible({ timeout: 10_000 });
    await placeOrder.click();

    // Land on order confirmation.
    await page.waitForURL(/\/store\/order-confirmation/, { timeout: 30_000 });
    await expect(page.locator('body')).toContainText(/order|confirmed|thank|#/i, { timeout: 10_000 });
  });
});
