import { test, expect } from '@playwright/test';
import { registerNewVendor, loginAsVendor, clearStorage, seedStoreHandle } from './helpers/auth';
import { newVendorCreds } from './helpers/data';

test.describe('Vendor auth', () => {
  test.beforeEach(async ({ context }) => {
    await seedStoreHandle(context);
  });

  test('vendor can register a new store and land on the dashboard', async ({ page }) => {
    const creds = await registerNewVendor(page);

    // We should be on /dashboard or /dashboard/onboarding.
    await expect(page).toHaveURL(/\/dashboard/);

    // Either a heading or the store name should be visible somewhere on the page.
    // Onboarding page shows a welcome/setup screen; dashboard shows top bar.
    const body = page.locator('body');
    await expect(body).toContainText(/dashboard|onboarding|welcome|store/i, { timeout: 10_000 });
    // Token was written to localStorage
    const token = await page.evaluate(() => localStorage.getItem('etommerce_vendor_token'));
    expect(token, 'vendor token should be saved in localStorage').toBeTruthy();

    // Creds returned are fresh per call.
    expect(creds.email).toMatch(/vendor-.+@example\.com/);
  });

  test('vendor can log out (clear token) and log back in', async ({ page, context }) => {
    const creds = await registerNewVendor(page);

    // Simulate logout by clearing the vendor token (no UI button exists yet).
    await page.evaluate(() => localStorage.removeItem('etommerce_vendor_token'));
    await clearStorage(context, page);

    // Now log in again via the UI.
    await loginAsVendor(page, creds.email, creds.password);
    await expect(page).toHaveURL(/\/dashboard/);
    const token = await page.evaluate(() => localStorage.getItem('etommerce_vendor_token'));
    expect(token).toBeTruthy();
  });

  test('invalid login shows an error banner', async ({ page }) => {
    // Use a credential that will not exist.
    const bogus = newVendorCreds();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(bogus.email);
    await page.locator('input[type="password"]').fill('WrongPassword!');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // The inline red error banner should appear.
    const errorBanner = page.locator('.bg-red-50');
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
    await expect(errorBanner).toContainText(/invalid|credentials|incorrect|match|failed/i);
  });
});
