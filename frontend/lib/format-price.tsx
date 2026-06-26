'use client';
import { useLang } from './i18n/context';
import type { Lang } from './i18n/translations';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBanglaDigits(s: string): string {
  return s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * Formats a BDT amount with the ৳ symbol, integer rounding, and
 * Indian-style grouping (e.g. 1,00,000). When `lang === 'bn'` numerals
 * are converted to Bangla digits.
 *
 * We avoid `toLocaleString('bn-BD')` because browser CLDR coverage for
 * bn-BD grouping/digit shaping is inconsistent across runtimes.
 */
export function formatPrice(n: number, lang: Lang): string {
  const grouped = Math.round(n).toLocaleString('en-IN');
  return lang === 'bn' ? '৳' + toBanglaDigits(grouped) : '৳' + grouped;
}

export function useFormatPrice(): (n: number) => string {
  const { lang } = useLang();
  return (n: number) => formatPrice(n, lang);
}

/**
 * Inline price renderer. Use anywhere you'd hand-write `৳{n.toLocaleString()}`.
 * Keeps theme files free of hook plumbing.
 */
export function Price({ value }: { value: number }) {
  const fmt = useFormatPrice();
  return <>{fmt(value)}</>;
}
