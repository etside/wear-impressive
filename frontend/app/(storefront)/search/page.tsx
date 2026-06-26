'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { getAvailableSizes } from '@/lib/product-variants';
import { useState, Suspense, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useTheme } from '@/lib/themes';
import { useLang } from '@/lib/i18n/context';
import { publicProductsApi, publicCategoriesApi } from '@/lib/api/services/storefront';
import type { Product } from '@/lib/api/types';

const RECENT_KEY_PREFIX = 'etommerce:recent_searches:';
const RECENT_LIMIT = 8;

/**
 * Persist the customer's recent searches in localStorage, scoped per shop
 * so multi-store users don't see another store's history. Most-recent first;
 * exact case-insensitive duplicates are deduped on push.
 */
function useRecentSearches(scopeKey: string) {
  const storageKey = `${RECENT_KEY_PREFIX}${scopeKey || 'default'}`;
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((s) => typeof s === 'string'));
      }
    } catch { /* corrupt entry — ignore */ }
  }, [storageKey]);

  const push = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setItems((prev) => {
      const lower = t.toLowerCase();
      // Bail out if the term is already at index 0 — returning `prev` keeps
      // the array reference stable so dependent effects don't see a "change"
      // and trigger another push (which was creating an infinite render loop
      // when the page-level useEffect listed `recent` in its dep array).
      if (prev[0]?.toLowerCase() === lower) return prev;
      const next = [t, ...prev.filter((p) => p.toLowerCase() !== lower)].slice(0, RECENT_LIMIT);
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, [storageKey]);

  const clear = useCallback(() => {
    setItems([]);
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
  }, [storageKey]);

  return { items, push, clear };
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function getDiscountedPrice(p: Product): number {
  const price = parseFloat(p.price) || 0;
  if (!p.discount || !p.discount_type) return price;
  const d = parseFloat(p.discount) || 0;
  return p.discount_type === 'percent' ? price - (price * d) / 100 : price - d;
}
function getOriginalPrice(p: Product): number | null {
  if (!p.discount || !p.discount_type) return null;
  return parseFloat(p.price) || 0;
}
function productBadge(p: Product): string | null {
  if (p.discount) return 'Sale';
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (publishedAt > thirtyDaysAgo) return 'New';
  return null;
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function SearchPageWrapper() {

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <SearchPage />
    </Suspense>
  );
}

function SuspenseFallback() {
  const { t } = useLang();
  return <div className="p-12 text-center text-sm text-gray-400">{t.storeSearch.loading}</div>;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

function SearchPage() {
  const __sb = useShopBase();
  const { t, lang } = useLang();
  const s = t.storeSearch;

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const { ProductCard } = useTheme();

  // Scope recent searches by the path's [handle] so a customer who visits
  // multiple stores doesn't get cross-pollinated suggestions.
  const recent = useRecentSearches(__sb);

  const searchQueryRes = useQuery({
    queryKey: ['storefront', 'search', debouncedQuery],
    queryFn: () => publicProductsApi.search({ q: debouncedQuery, per_page: 24 }),
    enabled: debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
  });

  // Save the search term once it produces results — saves us from polluting
  // history with typos or partial typing. We only persist a term if it found
  // at least one product.
  //
  // Dep on `recent.push` specifically (a stable useCallback) rather than
  // the whole `recent` object. The hook returns a fresh wrapper object on
  // every render, so `[recent]` would trigger this effect on every render
  // and (combined with the unconditional state update inside push) lock
  // the page into an infinite re-render — blocking every click.
  const recentPush = recent.push;
  useEffect(() => {
    if (!debouncedQuery) return;
    const total = searchQueryRes.data?.total ?? searchQueryRes.data?.data?.length ?? 0;
    if (total > 0) recentPush(debouncedQuery);
  }, [debouncedQuery, searchQueryRes.data, recentPush]);

  // Popular searches — derived from the store's own categories, ranked by
  // active product count. This stays meaningful as the catalog grows and
  // requires no separate analytics pipeline. Hidden if the store has no
  // categories with products.
  const popularQuery = useQuery({
    queryKey: ['storefront', 'categories', 'all'],
    queryFn: () => publicCategoriesApi.list({ all: 1 as const }),
    staleTime: 60_000,
  });
  const popular = useMemo(() => {
    const cats = popularQuery.data ?? [];
    return cats
      .filter((c) => (c.products_count ?? 0) > 0)
      .sort((a, b) => (b.products_count ?? 0) - (a.products_count ?? 0))
      .slice(0, 6)
      .map((c) => c.name);
  }, [popularQuery.data]);

  const hasQuery = query.trim().length > 0;
  const results = searchQueryRes.data?.data ?? [];

  return (
    <div className="container-app pt-12 pb-10">
      {/* Breadcrumb */}
      <nav className="flex gap-2 text-xs text-gray-500 mb-8">
        <Link href={__sb} className="hover:text-gray-900">{s.home}</Link>
        <span>/</span>
        <span className="text-gray-900">{s.title}</span>
      </nav>

      {/* Search input (large, centered) */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={s.placeholder}
            autoFocus
            className="w-full h-14 pl-12 pr-12 text-base border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none bg-white transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results or suggestions */}
      {hasQuery ? (
        <>
          {/* Results header — Bangla word order is "<query> এর জন্য N ফলাফল",
              English is "N results for <query>" — render each language in
              its natural order. */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              {(() => {
                const q = <span className="font-medium text-gray-900">&quot;{query.trim()}&quot;</span>;
                const total = searchQueryRes.data?.total ?? results.length;
                // Convert Western digits to Bangla numerals for the count
                // when the active language is BN, so "5 results" reads as
                // "৫ ফলাফল".
                const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
                const totalLabel = lang === 'bn'
                  ? String(total).replace(/\d/g, (d) => BN_DIGITS[Number(d)])
                  : String(total);
                if (searchQueryRes.isLoading) {
                  return lang === 'bn'
                    ? <>{q} {s.searchingFor}...</>
                    : <>{s.searchingFor} {q}...</>;
                }
                if (results.length > 0) {
                  const word = total === 1 ? s.resultFor : s.resultsFor;
                  return lang === 'bn'
                    ? <>{q} এর জন্য {totalLabel}{word}</>
                    : <>{totalLabel} {word} {q}</>;
                }
                return lang === 'bn'
                  ? <>{q} {s.noResultsFor}</>
                  : <>{s.noResultsFor} {q}</>;
              })()}
            </p>
          </div>

          {searchQueryRes.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {results.map(prod => (
                <ProductCard
                  key={prod.id}
                  id={prod.id}
                  name={prod.name}
                  price={Math.round(getDiscountedPrice(prod))}
                  originalPrice={getOriginalPrice(prod)}
                  badge={productBadge(prod)}
                  rating={0}
                  reviews={0}
                  image={prod.featured_image}
                  availableSizes={getAvailableSizes(prod)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Search size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-500 mb-1">
                {lang === 'bn'
                  ? <>&quot;{query.trim()}&quot; {s.noResultsFor}</>
                  : <>{s.noResultsFor} &quot;{query.trim()}&quot;</>}
              </p>
              <p className="text-xs text-gray-400">{s.tryDifferent}</p>
              <Link href={`${__sb}/products`} className="inline-block mt-4 text-xs font-medium text-gray-900 hover:underline">
                {s.browseAll}
              </Link>
            </div>
          )}
        </>
      ) : (
        /* No query -- show recent & popular searches */
        <div className="max-w-2xl mx-auto">
          {/* Recent searches — only render when the customer has a history */}
          {recent.items.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} />
                  {s.recent}
                </h3>
                <button
                  onClick={recent.clear}
                  className="text-[11px] text-gray-400 hover:text-gray-700"
                >
                  {s.clear}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.items.map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular searches — derived from the store's top categories */}
          {popular.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp size={13} />
                {s.popular}
              </h3>
              <div className="flex flex-wrap gap-2">
                {popular.map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recent.items.length === 0 && popular.length === 0 && !popularQuery.isLoading && (
            <p className="text-center text-sm text-gray-400 py-12">
              {s.emptyHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
