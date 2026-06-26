import { test, expect } from '@playwright/test';

/**
 * The backend rate-limits /api/vendor/login at 10 requests / minute by IP.
 * Hitting it 11 times in a row should produce a 429 which the UI surfaces
 * as an inline error banner (message typically includes "too many" / "rate limit").
 *
 * NOTE: running this spec exhausts the throttle bucket for the worker's IP
 * for ~60s, which can cause subsequent auth tests to return 429. The file is
 * named `zz-...` so Playwright's alphabetical spec ordering runs it LAST,
 * isolating the side-effect.
 */
test.describe('Rate limiting', () => {
  test('repeated failed logins eventually surface a rate-limit message', async ({ page }) => {
    test.slow();

    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submit = page.getByRole('button', { name: /^sign in$/i });

    // Laravel's throttle bucket resets every 60s, and earlier tests may have
    // already consumed part of it. Loop up to 25 times and exit as soon as the
    // rate-limit banner shows up.
    const ratePattern = /too many|rate limit|try again|throttl/i;
    let saw429 = false;

    for (let attempt = 1; attempt <= 25; attempt++) {
      await emailInput.fill(`rate-test-${attempt}@example.com`);
      await passwordInput.fill('WrongPassword!');
      await submit.click();

      const banner = page.locator('.bg-red-50');
      await expect(banner).toBeVisible({ timeout: 10_000 });
      const text = (await banner.innerText()).toLowerCase();
      if (ratePattern.test(text)) {
        saw429 = true;
        break;
      }
    }

    expect(
      saw429,
      'Expected rate-limit banner within 25 attempts — backend throttle may be misconfigured.',
    ).toBe(true);
  });
});
