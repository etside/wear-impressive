'use client';
import { useShopBase } from '@/lib/use-shop-base';
import { getAvailableSizes } from "@/lib/product-variants";
import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SlidersHorizontal, ChevronDown, X, Search } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { useTheme } from "@/lib/themes";
import {
  publicProductsApi,
  publicCategoriesApi,
  type PublicProductListParams,
} from "@/lib/api/services/storefront";
import type { Product, ProductCategory } from "@/lib/api/types";

const PRICE_BOUNDS: [number, number | null][] = [
  [0, 500],
  [500, 1000],
  [1000, 2000],
  [2000, 5000],
  [5000, null],
];

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
const SORT_KEYS: SortOption[] = ['featured', 'price-asc', 'price-desc', 'rating', 'newest'];

function sortToApi(s: SortOption): PublicProductListParams['sort'] | undefined {
  switch (s) {
    case 'price-asc': return 'price_asc';
    case 'price-desc': return 'price_desc';
    case 'rating': return 'rating';
    case 'newest': return 'newest';
    default: return undefined;
  }
}

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

interface FilterSidebarProps {
  search: string;
  setSearch: (v: string) => void;
  /** Full category records — sidebar nests sub-cats under their parent. */
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCatIds: number[];
  toggleCatId: (id: number) => void;
  selectedPrice: number | null;
  setSelectedPrice: (v: number | null) => void;
  priceRangeLabels: string[];
  /**
   * Variant-option facet aggregations across the current product set, e.g.
   * { Size: { '22': 1, '23': 1, ... }, Color: { 'Red': 3, ... } }
   * Each label becomes its own collapsible filter section.
   */
  optionFacets: Record<string, Record<string, number>>;
  selectedOptions: Record<string, Set<string>>;
  toggleOption: (label: string, value: string) => void;
  hasFilters: boolean;
  clearAll: () => void;
}

// Hoisted out of the page so React preserves the search input's identity
// across renders — otherwise typing one character unmounts/remounts it and
// drops focus.
function FilterSidebar({
  search, setSearch,
  categories, categoriesLoading,
  selectedCatIds, toggleCatId,
  selectedPrice, setSelectedPrice,
  priceRangeLabels,
  optionFacets, selectedOptions, toggleOption,
  hasFilters, clearAll,
}: FilterSidebarProps) {
  // Group: top-level categories, then their children. Sub-cats are rendered
  // indented underneath their parent so the hierarchy is visible. Orphans
  // (sub-cats whose parent isn't in the list) get rendered at the top level.
  // We also drop empty branches — a category that has 0 own products AND no
  // child with products would just send the user to an empty grid. Backend
  // populates products_count via withCount('products'); fallback to 0.
  const countOf = (c: ProductCategory) => c.products_count ?? c.product_count ?? 0;

  const childrenByParent: Record<number, ProductCategory[]> = {};
  for (const c of categories) {
    if (c.parent_id) {
      (childrenByParent[c.parent_id] ??= []).push(c);
    }
  }
  const topLevel = categories.filter((c) => {
    if (c.parent_id) return false;
    const ownProducts = countOf(c) > 0;
    const hasChildren = (childrenByParent[c.id]?.length ?? 0) > 0;
    return ownProducts || hasChildren;
  });
  const orphans = categories.filter(
    (c) =>
      c.parent_id &&
      !categories.some((p) => p.id === c.parent_id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="bg-transparent text-sm outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={13} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Category</h3>
        {categoriesLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[...topLevel, ...orphans].map((cat) => (
              <CategoryNode
                key={cat.id}
                cat={cat}
                children={childrenByParent[cat.id] ?? []}
                selectedCatIds={selectedCatIds}
                toggleCatId={toggleCatId}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Price</h3>
        <div className="flex flex-col gap-1.5">
          {priceRangeLabels.map((r, i) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="price"
                className="rounded-full"
                checked={selectedPrice === i}
                onChange={() => setSelectedPrice(i)}
                onClick={() => { if (selectedPrice === i) setSelectedPrice(null); }}
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{r}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dynamic variant-option filters — Size, Color, etc. Only renders
          when the current product set actually has variants with options. */}
      {Object.entries(optionFacets).map(([label, values]) => {
        const sorted = sortFacetValues(label, values);
        if (sorted.length === 0) return null;
        const picked = selectedOptions[label] ?? new Set<string>();
        return (
          <div key={label}>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Filter by {label}
            </h3>
            <div className="flex flex-col gap-1.5">
              {sorted.map(([val, count]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={picked.has(val)}
                    onChange={() => toggleOption(label, val)}
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                    {label}/{val}
                  </span>
                  <span className="text-xs text-gray-400">({count})</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {hasFilters && (
        <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
          Clear all filters
        </button>
      )}
    </div>
  );
}

/* ── CategoryNode — parent row + indented children ──────────────── */
function CategoryNode({
  cat, children, selectedCatIds, toggleCatId,
}: {
  cat: ProductCategory;
  children: ProductCategory[];
  selectedCatIds: number[];
  toggleCatId: (id: number) => void;
}) {
  const count = cat.products_count ?? cat.product_count ?? 0;
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          className="rounded"
          checked={selectedCatIds.includes(cat.id)}
          onChange={() => toggleCatId(cat.id)}
        />
        <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium flex-1">
          {cat.name}
        </span>
        {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
      </label>
      {children.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1.5 ml-5 pl-2 border-l border-gray-100">
          {children.map((sub) => {
            // Subcategories are linked via sub_category_id on products, so use
            // sub_category_products_count for their count, not products_count.
            const subCount = sub.sub_category_products_count ?? sub.products_count ?? sub.product_count ?? 0;
            return (
              <label key={sub.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedCatIds.includes(sub.id)}
                  onChange={() => toggleCatId(sub.id)}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">{sub.name}</span>
                {subCount > 0 && <span className="text-xs text-gray-400">({subCount})</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Apparel-aware sort for facet values: numbers numerically, sizes by canonical
 *  XS→XXL order, anything else lexicographically. Returns [value, count] pairs. */
const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
};
function sortFacetValues(label: string, values: Record<string, number>): Array<[string, number]> {
  const isSize = label.toLowerCase() === 'size';
  return Object.entries(values).sort(([a], [b]) => {
    if (isSize) {
      const an = Number(a), bn = Number(b);
      const aNum = Number.isFinite(an) && /^[\d.]+$/.test(a);
      const bNum = Number.isFinite(bn) && /^[\d.]+$/.test(b);
      if (aNum && bNum) return an - bn;
      const ao = SIZE_ORDER[a.toUpperCase()];
      const bo = SIZE_ORDER[b.toUpperCase()];
      if (ao !== undefined && bo !== undefined) return ao - bo;
    }
    return a.localeCompare(b);
  });
}

export default function ProductsListPageWrapper() {

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Loading...</div>}>
      <ProductsListPage />
    </Suspense>
  );
}

function ProductsListPage() {
  const __sb = useShopBase();

  const { t } = useLang();
  const p = t.storeProducts;
  const searchParams = useSearchParams();
  const categorySlugParam = searchParams.get('category') ?? '';

  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Dynamic variant-option filter state — keyed by option label
  // (e.g. "Size", "Color"), value = set of selected values for that label.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});
  const [mobileFilter, setMobileFilter] = useState(false);
  const [page, setPage] = useState(1);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleCatId = (id: number) =>
    setSelectedCatIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleOption = (label: string, value: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      const set = new Set(next[label] ?? []);
      if (set.has(value)) set.delete(value); else set.add(value);
      if (set.size === 0) delete next[label];
      else next[label] = set;
      return next;
    });
  };

  const optionFiltersActive = Object.keys(selectedOptions).length > 0;
  const hasFilters =
    selectedCatIds.length > 0 ||
    selectedPrice !== null ||
    search.trim() !== '' ||
    optionFiltersActive;
  const clearAll = () => {
    setSelectedCatIds([]);
    setSelectedPrice(null);
    setSearch('');
    setSelectedOptions({});
  };
  const { ProductCard } = useTheme();

  const categoriesQuery = useQuery({
    // Pass `all: 1` so the backend returns sub-categories too, not just
    // top-level ones — sidebar nests them under their parent.
    queryKey: ['storefront', 'categories', { active: true, all: true }],
    queryFn: () => publicCategoriesApi.list({ is_active: true, all: 1 }),
  });

  // Preselect category from ?category=<id-or-slug-or-name> in the URL.
  // Runs whenever the param or category list changes so deep-links from the
  // homepage builder ("View all") and the header menu pre-tick the filter.
  // The homepage builder + menu seeds use numeric ids (e.g. ?category=7),
  // legacy and category landing pages use slugs (e.g. ?category=cargo-pants).
  useEffect(() => {
    if (!categorySlugParam || !categoriesQuery.data) return;
    const raw = decodeURIComponent(categorySlugParam).trim();
    const lower = raw.toLowerCase();
    const numeric = /^\d+$/.test(raw) ? Number(raw) : null;
    const match = categoriesQuery.data.find((c) =>
      (numeric !== null && c.id === numeric) ||
      c.slug?.toLowerCase() === lower ||
      c.name?.toLowerCase() === lower,
    );
    if (match && !selectedCatIds.includes(match.id)) {
      setSelectedCatIds([match.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlugParam, categoriesQuery.data]);

  // Build a map from each category id → set of all its descendant ids (including itself).
  // Used to expand a parent-category selection into all its leaf categories so the
  // products list shows children's items too (e.g. selecting "Women's Clothing"
  // surfaces products from Cargo Pants, T-Shirts, etc.).
  const descendantsByCatId = useMemo(() => {
    const map = new Map<number, Set<number>>();
    interface CatNode { id: number; children?: CatNode[] }
    const collect = (node: CatNode, into: Set<number>) => {
      into.add(node.id);
      for (const k of node.children ?? []) collect(k, into);
    };
    const visit = (node: CatNode) => {
      const set = new Set<number>();
      collect(node, set);
      map.set(node.id, set);
      for (const k of node.children ?? []) visit(k);
    };
    for (const c of (categoriesQuery.data ?? []) as CatNode[]) visit(c);
    return map;
  }, [categoriesQuery.data]);

  const expandedCatIds = useMemo(() => {
    const out = new Set<number>();
    for (const id of selectedCatIds) {
      const descs = descendantsByCatId.get(id);
      if (descs) descs.forEach((d) => out.add(d));
      else out.add(id);
    }
    return Array.from(out);
  }, [selectedCatIds, descendantsByCatId]);

  // When exactly one top-level leaf category is selected, push it to the API
  // for server-side filtering. Subcategory ids are NOT sent to the API because
  // products store their parent in category_id, not the subcategory — so we
  // always filter subcategory selections client-side via sub_category_id.
  const allCats = categoriesQuery.data ?? [];
  const selectedCatData = selectedCatIds.map(id => allCats.find(c => c.id === id));
  const oneLeafSelected = selectedCatIds.length === 1
    && !selectedCatData[0]?.parent_id
    && (descendantsByCatId.get(selectedCatIds[0])?.size ?? 1) === 1;

  const queryParams = useMemo<PublicProductListParams>(() => {
    const pr: PublicProductListParams = {
      page,
      per_page: 24,
      sort: sortToApi(sortBy),
    };
    if (search.trim()) pr.search = search.trim();
    if (oneLeafSelected) pr.category_id = selectedCatIds[0];
    if (selectedPrice !== null) {
      const [min, max] = PRICE_BOUNDS[selectedPrice];
      pr.price_min = min;
      if (max !== null) pr.price_max = max;
    }
    return pr;
  }, [page, sortBy, search, selectedCatIds, selectedPrice, oneLeafSelected]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, selectedCatIds, selectedPrice, sortBy]);

  const productsQuery = useQuery({
    queryKey: ['storefront', 'products', queryParams],
    queryFn: () => publicProductsApi.list(queryParams),
    placeholderData: keepPreviousData,
  });

  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data?.data ?? [];
  const total = productsQuery.data?.total ?? 0;
  const lastPage = productsQuery.data?.last_page ?? 1;

  // Aggregate variant options across the loaded product set so the sidebar
  // can render dynamic facets (Size, Color, etc.). Only counts in-stock
  // variants — sold-out values would be misleading filters.
  const optionFacets = useMemo<Record<string, Record<string, number>>>(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const pr of products) {
      const seenForThisProduct = new Set<string>();
      for (const v of pr.variants ?? []) {
        if ((v.stock ?? 0) <= 0) continue;
        for (const [label, value] of Object.entries(v.options ?? {})) {
          const trimmed = String(value ?? '').trim();
          if (!trimmed) continue;
          // Count each (label,value) once per product so the count reflects
          // how many products offer that size/color, not how many SKUs.
          const key = `${label}:${trimmed}`;
          if (seenForThisProduct.has(key)) continue;
          seenForThisProduct.add(key);
          (out[label] ??= {})[trimmed] = ((out[label] ?? {})[trimmed] ?? 0) + 1;
        }
      }
    }
    return out;
  }, [products]);

  // Client-side narrowing — applied AFTER the API call (which already
  // handles category/price/search/sort). Multi-category and variant-option
  // filters are local because the public list endpoint only takes a single
  // category_id and doesn't filter by variant options yet.
  const visibleProducts = useMemo(() => {
    let list = products;
    // Apply client-side category filter whenever the API didn't already
    // narrow the list (i.e. multi-select OR a parent category was picked).
    if (selectedCatIds.length > 0 && !oneLeafSelected) {
      list = list.filter((pr) =>
        (pr.category_id != null && expandedCatIds.includes(pr.category_id)) ||
        (pr.sub_category_id != null && expandedCatIds.includes(pr.sub_category_id))
      );
    }
    if (Object.keys(selectedOptions).length > 0) {
      list = list.filter((pr) => {
        // A product matches when, for every selected option label, at least
        // one of its in-stock variants has a value in the selected set.
        for (const [label, values] of Object.entries(selectedOptions)) {
          const hit = (pr.variants ?? []).some((v) => {
            if ((v.stock ?? 0) <= 0) return false;
            const val = v.options?.[label];
            return val !== undefined && values.has(String(val).trim());
          });
          if (!hit) return false;
        }
        return true;
      });
    }
    return list;
  }, [products, selectedCatIds, selectedOptions, expandedCatIds, oneLeafSelected]);

  const sidebarProps: FilterSidebarProps = {
    search,
    setSearch,
    categories,
    categoriesLoading: categoriesQuery.isLoading,
    selectedCatIds,
    toggleCatId,
    selectedPrice,
    setSelectedPrice,
    priceRangeLabels: p.priceRanges,
    optionFacets,
    selectedOptions,
    toggleOption,
    hasFilters,
    clearAll,
  };

  return (
    <div className="container-app pt-12 pb-10">
      {/* Breadcrumb */}
      <nav className="flex gap-2 text-xs text-gray-500 mb-6">
        <Link href={__sb} className="hover:text-gray-900">{p.home}</Link>
        <span>/</span>
        <span className="text-gray-900">{p.allProducts}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{p.title}</h1>
        <span className="text-sm text-gray-500">{total} products</span>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar - Desktop */}
        <aside className="hidden lg:block w-52 shrink-0">
          <FilterSidebar {...sidebarProps} />
        </aside>

        {/* Mobile filter overlay */}
        {mobileFilter && (
          <div className="fixed inset-0 bg-black/40 z-50 lg:hidden">
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Filters</h2>
                <button onClick={() => setMobileFilter(false)}><X size={18} /></button>
              </div>
              <FilterSidebar {...sidebarProps} />
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {/* Sort & Filter row */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setMobileFilter(true)}
              className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 lg:hidden">
              <SlidersHorizontal size={15} /> {p.filter}
              {hasFilters && <span className="w-2 h-2 rounded-full bg-black" />}
            </button>
            <div className="flex items-center gap-2 ml-auto relative" ref={sortRef}>
              <span className="text-sm text-gray-500 hidden sm:block">{p.sort}:</span>
              <button onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 h-9 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                {p.sortLabels[sortBy]} <ChevronDown size={14} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                  {SORT_KEYS.map((key) => (
                    <button key={key} onClick={() => { setSortBy(key); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortBy === key ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {p.sortLabels[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {visibleProducts.map(prod => (
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
            <div className="py-20 text-center">
              <p className="text-sm text-gray-400 mb-2">No products match your filters</p>
              <button onClick={clearAll} className="text-xs font-medium text-gray-700 hover:underline">Clear all filters</button>
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex justify-center gap-1 mt-10">
              {Array.from({ length: lastPage }).slice(0, 5).map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-9 h-9 text-sm rounded-lg transition-colors ${pg === page ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    {pg}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
