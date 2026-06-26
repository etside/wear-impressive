import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Super admin flows. We use the seeded `phase4-test` store for suspend/activate
 * so we never disturb `test-store`, which other tests depend on.
 */
test.describe('Super admin', () => {
  test('login lands on admin dashboard with stat cards', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await expect(page).toHaveURL(/\/admin(\/|$)/);
    await expect(page.getByRole('heading', { name: /platform dashboard/i })).toBeVisible();

    // Stat card labels render after the stats query resolves.
    await expect(page.getByText(/total stores/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^vendors$/i).first()).toBeVisible();
  });

  test('can browse stores list and suspend / reactivate phase4-test', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto('/admin/stores');
    await expect(page.getByRole('heading', { name: /^stores$/i })).toBeVisible();

    // Search for phase4-test to make sure we click the right one. Search runs
    // against name / handle / email, so the handle match is sufficient.
    const searchBox = page.getByPlaceholder(/search by name/i);
    await searchBox.fill('phase4-test');
    // Debounced 300ms + network round-trip.
    await page.waitForTimeout(800);

    // Ensure the /phase4-test handle label is visible in the table.
    await expect(page.getByText('/phase4-test').first()).toBeVisible({ timeout: 10_000 });

    // Click the first store-name link in the filtered table.
    // The link must be nested under /admin/stores/<numeric id> (not the list
    // page itself, and not the "View" action which also navigates there).
    const firstStoreLink = page.locator('table a[href^="/admin/stores/"]:not([href$="/admin/stores"])').first();
    await firstStoreLink.click();

    await expect(page).toHaveURL(/\/admin\/stores\/\d+/);

    // Capture initial status so we can restore it.
    const activeBadge = page.getByText('Active', { exact: true });
    const suspendedBadge = page.getByText('Suspended', { exact: true });

    // Wait for the store detail to finish hydrating — without this, the
    // isVisible() check fires before React mounts the badge and always returns
    // false, which sends the test down the wrong branch.
    await expect(activeBadge.or(suspendedBadge)).toBeVisible({ timeout: 15_000 });
    const startedActive = await activeBadge.isVisible().catch(() => false);

    if (startedActive) {
      // Suspend flow — click Suspend, accept the confirm dialog.
      page.once('dialog', (dlg) => dlg.accept());
      await page.getByRole('button', { name: /suspend/i }).click();

      await expect(suspendedBadge).toBeVisible({ timeout: 10_000 });

      // Now re-activate.
      await page.getByRole('button', { name: /activate/i }).click();
      await expect(activeBadge).toBeVisible({ timeout: 10_000 });
    } else {
      // Store was already suspended — activate first, then verify suspend works, then restore.
      await page.getByRole('button', { name: /activate/i }).click();
      await expect(activeBadge).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dlg) => dlg.accept());
      await page.getByRole('button', { name: /suspend/i }).click();
      await expect(suspendedBadge).toBeVisible({ timeout: 10_000 });

      // Restore to active (leave the repo in a clean state).
      await page.getByRole('button', { name: /activate/i }).click();
      await expect(activeBadge).toBeVisible({ timeout: 10_000 });
    }
  });

  test('logout returns to admin login page', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.getByRole('button', { name: /logout/i }).click();
    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});
