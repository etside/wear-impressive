'use client';

/**
 * Single-tenant build (Wear Impressive). The storefront is served from
 * the root path, so the URL prefix is empty — every existing call site
 * builds links like `${sb}/products` and gets `/products` as expected.
 *
 * Kept as a hook + plain function for API parity with the multi-tenant
 * SaaS codebase, but neither reads from params anymore.
 */
export function useShopBase(): string {
  return '';
}

export function shopBase(): string {
  return '';
}
