import type { Product } from '@/lib/api/types';

/**
 * Pull in-stock size values from a product's variants for display on
 * product cards. Returns a de-duplicated, naturally-sorted list.
 *
 * - Looks at variant.options for any key whose lowercase form === "size"
 *   (so it works with "Size", "size", or any future locale variant tagged
 *   the same way at upload time).
 * - Filters out variants where stock <= 0 (no point advertising sold-out).
 * - Numeric sizes (35, 36, 37) sort numerically; non-numeric (S, M, L) sort
 *   in their natural order via the SIZE_ORDER table; mixed lists fall back
 *   to lexicographic.
 */
const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
};

export function getAvailableSizes(product: Product | null | undefined): string[] {
  if (!product?.variants || product.variants.length === 0) return [];

  const found = new Set<string>();
  for (const v of product.variants) {
    if ((v.stock ?? 0) <= 0) continue;
    if (!v.options) continue;
    for (const [key, value] of Object.entries(v.options)) {
      if (key.toLowerCase() !== 'size') continue;
      const trimmed = String(value ?? '').trim();
      if (trimmed) found.add(trimmed);
    }
  }

  return Array.from(found).sort((a, b) => {
    const an = Number(a);
    const bn = Number(b);
    const aNum = Number.isFinite(an) && /^[\d.]+$/.test(a);
    const bNum = Number.isFinite(bn) && /^[\d.]+$/.test(b);
    if (aNum && bNum) return an - bn;
    const ao = SIZE_ORDER[a.toUpperCase()];
    const bo = SIZE_ORDER[b.toUpperCase()];
    if (ao !== undefined && bo !== undefined) return ao - bo;
    return a.localeCompare(b);
  });
}
