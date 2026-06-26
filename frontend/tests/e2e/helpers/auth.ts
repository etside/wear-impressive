import { expect, type BrowserContext, type Page } from '@playwright/test';
import { newVendorCreds, newCustomerCreds, type VendorCreds, type CustomerCreds } from './data';

/**
 * Walk through the vendor /register form. Returns the generated creds
 * so follow-up steps (login / API) can reuse them.
 */
export async function registerNewVendor(page: Page): Promise<VendorCreds> {
  const creds = newVendorCreds();

  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /create your store/i })).toBeVisible();

  // The shared Input component uses `htmlFor` so getByLabel is reliable for
  // these fields.
  await page.getByLabel('Your Name').fill(creds.name);
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="tel"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByLabel('Store Name').fill(creds.storeName);

  // Store handle auto-slugifies from store name; override with unique value.
  const handleInput = page.locator('input[placeholder="my-store"]');
  await handleInput.fill(creds.storeHandle);

  await page.getByRole('button', { name: /create free store/i }).click();

  // Successful register redirects to /dashboard/onboarding.
  await page.waitForURL(/\/dashboard(\/onboarding)?/, { timeout: 20_000 });

  return creds;
}

export async function loginAsVendor(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

export async function loginAsSuperAdmin(
  page: Page,
  email = 'admin@etommerce.com',
  password = 'password',
): Promise<void> {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  // Land on /admin (dashboard) after login.
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 20_000 });
  // Allow a moment for the dashboard to render before asserting.
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function registerNewCustomer(page: Page): Promise<CustomerCreds> {
  const creds = newCustomerCreds();

  await page.goto('/store/account/register');
  await expect(page.getByRole('heading', { name: /create (your )?account|sign up/i })).toBeVisible();

  // Fill via placeholder selectors (labels use translations that may vary).
  await page.getByPlaceholder('Sanjida Priya').fill(creds.name);
  await page.getByPlaceholder('you@example.com').fill(creds.email);
  await page.locator('input[type="password"]').first().fill(creds.password);
  await page.locator('input[type="password"]').nth(1).fill(creds.password);

  // Terms checkbox.
  await page.locator('input[type="checkbox"]').first().check();

  await page.getByRole('button', { name: /create account/i }).click();

  // Wait for the exact /store/account page (not /store/account/register etc.).
  await page.waitForURL((url) => /\/store\/account\/?(?:\?|$)/.test(url.pathname + url.search), { timeout: 20_000 });

  return creds;
}

export async function loginAsCustomer(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/store/account/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL((url) => /\/store\/account\/?(?:\?|$)/.test(url.pathname + url.search), { timeout: 20_000 });
}

/**
 * Clear all browser storage (localStorage, sessionStorage, cookies) to
 * reset auth state. Must be called with an active page that has already
 * navigated to a URL on baseURL (Playwright security restriction).
 */
export async function clearStorage(context: BrowserContext, page?: Page): Promise<void> {
  await context.clearCookies();
  if (page) {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore (page may not have origin yet) */
      }
    });
  }
}

/**
 * Seed the `X-Store-Handle` into localStorage before the first navigation,
 * so axios requests include it even if the env var is not set.
 */
export async function seedStoreHandle(context: BrowserContext, handle = 'test-store'): Promise<void> {
  await context.addInitScript((h) => {
    try {
      window.localStorage.setItem('etommerce_store_handle', h);
    } catch {
      /* ignore */
    }
  }, handle);
}
