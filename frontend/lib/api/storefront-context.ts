/**
 * Storefront request context helpers — single-tenant build for Wear
 * Impressive. The store handle is hardcoded at the top of this file; the
 * multi-tenant subdomain / URL / localStorage resolution from the
 * platform codebase is gone since there's only ever one store.
 *
 * Guest carts are tracked client-side via a locally generated token which
 * is sent as the `X-Cart-Token` header. The backend uses this token (in
 * place of an authed customer) to look up / create the guest cart.
 */
import { apiClient } from './client';

const CART_TOKEN_KEY = 'etommerce_cart_token';

/**
 * Repoint this build at a different store by changing the constant below
 * — no other call site reads the handle directly.
 */
const TENANT_HANDLE = 'wi';

/* ── Cart token (guest) ───────────────────────────────────────────── */
export function getCartToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(CART_TOKEN_KEY);
  if (!token) {
    token =
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);
    localStorage.setItem(CART_TOKEN_KEY, token);
  }
  return token;
}

export function clearCartToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_TOKEN_KEY);
}

/* ── Store handle ─────────────────────────────────────────────────── */

export function getStoreHandle(): string {
  return TENANT_HANDLE;
}

/**
 * Kept as a no-op so any straggler caller doesn't crash. The single-tenant
 * build doesn't allow runtime store switching.
 */
export function setStoreHandle(_handle: string): void {
  /* no-op — single-tenant build */
}

/* ── Interceptor setup (call once at module load) ─────────────────── */
let installed = false;
export function installStorefrontInterceptor(): void {
  if (installed) return;
  installed = true;

  apiClient.interceptors.request.use((config) => {
    const url = config.url || '';

    // Attach store handle to every storefront / customer request.
    const needsStore =
      url.startsWith('/store') ||
      url.startsWith('store/') ||
      url.startsWith('/customer') ||
      url.startsWith('customer/');

    if (needsStore) {
      const handle = getStoreHandle();
      if (handle) {
        config.headers['X-Store-Handle'] = handle;
      }
    }

    // Attach guest cart token to cart & checkout requests.
    const needsCartToken =
      url.startsWith('/store/cart') ||
      url.startsWith('store/cart') ||
      url.startsWith('/store/checkout') ||
      url.startsWith('store/checkout');

    if (needsCartToken) {
      const token = getCartToken();
      if (token) {
        config.headers['X-Cart-Token'] = token;
      }
    }

    return config;
  });
}
