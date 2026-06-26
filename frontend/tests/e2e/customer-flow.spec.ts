import { test, expect } from '@playwright/test';
import { registerNewCustomer, loginAsCustomer, seedStoreHandle, clearStorage } from './helpers/auth';

test.describe('Customer account flow', () => {
  test.beforeEach(async ({ context }) => {
    await seedStoreHandle(context);
  });

  test('customer can register, logout, and login again', async ({ page, context }) => {
    const creds = await registerNewCustomer(page);
    // Should be on customer account page with a token.
    await expect(page).toHaveURL(/\/store\/account/);
    const token = await page.evaluate(() => localStorage.getItem('etommerce_customer_token'));
    expect(token).toBeTruthy();

    // Logout by clearing the token (UI button is inside the sidebar — also
    // acceptable to click, but the simplest cross-theme approach is clear).
    await page.evaluate(() => localStorage.removeItem('etommerce_customer_token'));
    await clearStorage(context, page);

    // Log back in via the UI.
    await loginAsCustomer(page, creds.email, creds.password);
    await expect(page).toHaveURL(/\/store\/account/);
    const token2 = await page.evaluate(() => localStorage.getItem('etommerce_customer_token'));
    expect(token2).toBeTruthy();
  });
});
